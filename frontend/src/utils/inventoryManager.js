import { supabase } from '../supabaseClient.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SIX SIGMAPHIL STONE SLAB INVENTORY AUTOMATION ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Automatically manages raw stone slab inventory across quotation lifecycles:
 * 
 * 1. SOFT_HOLD_PHASE (7-Day Soft Holds):
 *    - 'pending', 'inspection_scheduled', 'inspection_completed', 'approved', 'in-review'
 *    - Automatically reserves `soft_hold_slabs` upon customer quote submission.
 *    - Protects the stone from double-booking while the client evaluates proposals.
 * 
 * 2. ALLOCATED_PHASE (Downpayment Confirmed):
 *    - 'downpayment_received', 'in_fabrication', 'installation_wip'
 *    - When downpayment is verified, converts soft hold into `allocated_slabs`.
 *    - Locks raw slabs for fabrication cutting.
 * 
 * 3. COMPLETED_PHASE:
 *    - 'completed'
 *    - When project is completed, installed and handed over, slabs permanently
 *      depart the warehouse: decrements `slab_count` (Total Physical Slabs) and
 *      releases `allocated_slabs`.
 * 
 * 4. CANCELLED_PHASE:
 *    - 'cancelled'
 *    - If quote or project is cancelled, returns slabs back to available inventory
 *      by releasing any active soft holds or downpayment allocations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const INVENTORY_PHASES = {
  SOFT_HOLD: ['pending', 'inspection_scheduled', 'inspection_completed', 'approved', 'in-review'],
  ALLOCATED: ['downpayment_received', 'in_fabrication', 'installation_wip'],
  COMPLETED: ['completed'],
  CANCELLED: ['cancelled'],
};

/**
 * Resolves a quotation status string into its operational inventory phase.
 */
export function getInventoryPhase(status) {
  if (!status) return null;
  const s = String(status).toLowerCase().trim();
  if (INVENTORY_PHASES.SOFT_HOLD.includes(s)) return 'SOFT_HOLD';
  if (INVENTORY_PHASES.ALLOCATED.includes(s)) return 'ALLOCATED';
  if (INVENTORY_PHASES.COMPLETED.includes(s)) return 'COMPLETED';
  if (INVENTORY_PHASES.CANCELLED.includes(s)) return 'CANCELLED';
  return null;
}

/**
 * Computes exact slab count deltas for a transition between two statuses.
 * @param {string|null} prevStatus - Prior quotation status (null if new submission)
 * @param {string} newStatus - New target quotation status
 * @param {number} requiredSlabs - Required raw slabs (default 1)
 * @returns {{ deltaSoftHold: number, deltaAllocated: number, deltaSlabCount: number }}
 */
export function calculateInventoryDeltas(prevStatus, newStatus, requiredSlabs = 1) {
  const prevPhase = getInventoryPhase(prevStatus);
  const newPhase = getInventoryPhase(newStatus);
  const slabs = Math.max(1, Number(requiredSlabs) || 1);

  let deltaSoftHold = 0;
  let deltaAllocated = 0;
  let deltaSlabCount = 0;

  // 1. Release holdings from the previous phase
  if (prevPhase === 'SOFT_HOLD') {
    deltaSoftHold -= slabs;
  } else if (prevPhase === 'ALLOCATED') {
    deltaAllocated -= slabs;
  } else if (prevPhase === 'COMPLETED') {
    // Reversing a completed project restores physical inventory
    deltaSlabCount += slabs;
  }

  // 2. Apply holdings for the new phase
  if (newPhase === 'SOFT_HOLD') {
    deltaSoftHold += slabs;
  } else if (newPhase === 'ALLOCATED') {
    deltaAllocated += slabs;
  } else if (newPhase === 'COMPLETED') {
    // Slabs are permanently consumed from warehouse physical inventory
    deltaSlabCount -= slabs;
  }

  return { deltaSoftHold, deltaAllocated, deltaSlabCount };
}

/**
 * Applies automated inventory state transitions directly to the `materials` table.
 * 
 * @param {Object} params
 * @param {string|null} params.prevStatus - Previous quotation status
 * @param {string} params.newStatus - New quotation status
 * @param {string} params.design - Material name (e.g. 'Verde Fiorito')
 * @param {number} params.requiredSlabs - Number of slabs
 * @param {Object} [params.supabaseClient] - Optional Supabase client instance
 * @returns {Promise<{ success: boolean, [key: string]: any }>}
 */
export async function applyQuotationInventoryTransition({
  prevStatus,
  newStatus,
  design,
  requiredSlabs = 1,
  supabaseClient = supabase,
}) {
  if (!design || design === 'Unknown' || design === 'Custom') {
    return { success: false, reason: 'No designated stone material' };
  }

  const slabs = Math.max(1, Number(requiredSlabs) || 1);
  const { deltaSoftHold, deltaAllocated, deltaSlabCount } = calculateInventoryDeltas(prevStatus, newStatus, slabs);

  // If no change across phases (e.g. 'downpayment_received' -> 'in_fabrication'), skip DB update
  if (deltaSoftHold === 0 && deltaAllocated === 0 && deltaSlabCount === 0) {
    return { success: true, unchanged: true, message: 'Status transition does not affect inventory levels' };
  }

  try {
    // 1. Fetch current live material record
    const { data: material, error: fetchErr } = await supabaseClient
      .from('materials')
      .select('id, name, slab_count, allocated_slabs, soft_hold_slabs, reorder_threshold, stock_sqm')
      .ilike('name', design.trim())
      .maybeSingle();

    if (fetchErr || !material) {
      console.warn(`[Inventory] Material "${design}" not found in database. Skipping automated stock update.`);
      return { success: false, reason: `Material "${design}" not found in inventory` };
    }

    const currentSlabCount = typeof material.slab_count === 'number' ? material.slab_count : (Number(material.slab_count) || 10);
    const currentAllocated = typeof material.allocated_slabs === 'number' ? material.allocated_slabs : (Number(material.allocated_slabs) || 0);
    const currentSoftHold = typeof material.soft_hold_slabs === 'number' ? material.soft_hold_slabs : (Number(material.soft_hold_slabs) || 0);
    const currentRop = typeof material.reorder_threshold === 'number' ? material.reorder_threshold : 2;

    // 2. Compute new stock levels defensively (floor at 0)
    const newSlabCount = Math.max(0, currentSlabCount + deltaSlabCount);
    const newAllocated = Math.max(0, currentAllocated + deltaAllocated);
    const newSoftHold = Math.max(0, currentSoftHold + deltaSoftHold);
    const newAvailable = Math.max(0, newSlabCount - newAllocated - newSoftHold);

    // 3. Dynamic Reorder Point (ROP) protection:
    // Ensures safety stock covers active demand while preserving user-defined threshold
    const dynamicRop = Math.max(currentRop, 2);

    // 4. Compute updated stock status badge
    let newStockStatus = 'available';
    if (newAvailable <= 0) {
      newStockStatus = 'out_of_stock';
    } else if (newAvailable <= dynamicRop) {
      newStockStatus = 'limited_stock';
    }

    // 5. Compute usable stock yield in square meters (approx 4.35 m² usable per slab)
    const newStockSqm = Math.max(0, parseFloat((newAvailable * 4.35).toFixed(2)));

    // 6. Update database record
    let { error: updateErr } = await supabaseClient
      .from('materials')
      .update({
        slab_count: newSlabCount,
        allocated_slabs: newAllocated,
        soft_hold_slabs: newSoftHold,
        stock_status: newStockStatus,
        stock_sqm: newStockSqm,
        reorder_threshold: dynamicRop,
      })
      .eq('id', material.id);

    // Fallback if some schema columns are unmigrated
    if (updateErr) {
      console.warn('[Inventory] Retrying update with fallback stock_status only:', updateErr.message);
      const fallbackRes = await supabaseClient
        .from('materials')
        .update({ stock_status: newStockStatus })
        .eq('id', material.id);
      updateErr = fallbackRes.error;
    }

    if (updateErr) throw updateErr;

    return {
      success: true,
      materialName: material.name,
      materialId: material.id,
      slabs,
      deltas: { deltaSoftHold, deltaAllocated, deltaSlabCount },
      previous: {
        slabCount: currentSlabCount,
        allocated: currentAllocated,
        softHold: currentSoftHold,
        available: Math.max(0, currentSlabCount - currentAllocated - currentSoftHold),
      },
      updated: {
        slabCount: newSlabCount,
        allocated: newAllocated,
        softHold: newSoftHold,
        available: newAvailable,
        rop: dynamicRop,
        stockStatus: newStockStatus,
        stockSqm: newStockSqm,
      },
    };
  } catch (err) {
    console.error('[Inventory] Error applying automated inventory transition:', err);
    return { success: false, error: err };
  }
}

/**
 * Generates human-readable audit text explaining the automated stock action for remarks_history.
 */
export function formatInventoryAuditEntry(transitionResult, newStatus) {
  if (!transitionResult?.success || transitionResult.unchanged) return null;

  const { materialName, slabs, updated, deltas } = transitionResult;
  const newPhase = getInventoryPhase(newStatus);

  let actionText = '';
  if (newPhase === 'SOFT_HOLD' && deltas.deltaSoftHold > 0) {
    actionText = `Quotation received. Automatically placed 7-day soft hold on ${slabs} slab(s) of ${materialName}. Available remaining: ${updated.available} slab(s).`;
  } else if (newPhase === 'ALLOCATED' && deltas.deltaAllocated > 0) {
    actionText = `Downpayment confirmed. Automatically hard-allocated ${slabs} slab(s) of ${materialName} for fabrication. Available: ${updated.available} slab(s).`;
  } else if (newPhase === 'COMPLETED' && deltas.deltaSlabCount < 0) {
    actionText = `Project completed and installed. Automatically deducted ${slabs} physical slab(s) of ${materialName} from warehouse stock. Total physical remaining: ${updated.slabCount} slab(s).`;
  } else if (newPhase === 'CANCELLED') {
    actionText = `Quotation cancelled. Automatically returned ${slabs} slab(s) of ${materialName} to available warehouse inventory. Available now: ${updated.available} slab(s).`;
  } else {
    actionText = `Inventory automatically adjusted for ${materialName} (${slabs} slab(s)). Available: ${updated.available} slab(s).`;
  }

  return {
    text: actionText,
    timestamp: new Date().toISOString(),
    author: 'Inventory Engine',
  };
}
