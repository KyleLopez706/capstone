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
  IN_PROGRESS: ['downpayment_received', 'in_fabrication', 'installation_wip'],
  COMPLETED: ['completed'],
  CANCELLED: ['cancelled', 'rejected'],
};

/**
 * Resolves a quotation status string into its operational inventory phase.
 */
export function getInventoryPhase(status) {
  if (!status) return null;
  const s = String(status).toLowerCase().trim();
  if (INVENTORY_PHASES.SOFT_HOLD.includes(s)) return 'SOFT_HOLD';
  if (INVENTORY_PHASES.IN_PROGRESS.includes(s)) return 'IN_PROGRESS';
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
  } else if (prevPhase === 'IN_PROGRESS') {
    // Reversing active work in progress restores physical warehouse stock
    deltaSlabCount += slabs;
    deltaAllocated -= slabs;
  } else if (prevPhase === 'COMPLETED') {
    // Reversing a completed project restores physical inventory
    deltaSlabCount += slabs;
  }

  // 2. Apply holdings for the new phase
  if (newPhase === 'SOFT_HOLD') {
    deltaSoftHold += slabs;
  } else if (newPhase === 'IN_PROGRESS') {
    // Slabs are immediately deducted from warehouse stock upon downpayment through installation
    deltaSlabCount -= slabs;
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
      .select('id, name, slab_count, allocated_slabs, soft_hold_slabs, reorder_threshold, stock_sqm, stock_status')
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
    // Since slab_count is directly deducted upon downpayment, available stock is physical slabs minus 7-day holds
    const newAvailable = Math.max(0, newSlabCount - newSoftHold);

    // 3. Dynamic Reorder Point (ROP) protection:
    // Ensures safety stock covers active demand while preserving user-defined threshold
    const dynamicRop = Math.max(currentRop, 2);

    // 4. Compute updated stock status badge (respecting admin's manual restocking_soon override)
    let newStockStatus = 'available';
    if (material.stock_status === 'restocking_soon') {
      newStockStatus = 'restocking_soon';
    } else if (newAvailable <= 0) {
      newStockStatus = 'out_of_stock';
    } else if (newAvailable <= dynamicRop) {
      newStockStatus = 'limited_stock';
    }

    // 5. Compute usable stock yield in square meters (approx 4.35 m² usable per slab)
    const newStockSqm = Math.max(0, parseFloat((newSlabCount * 4.35).toFixed(1)));

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
        available: Math.max(0, currentSlabCount - currentSoftHold),
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
  const s = String(newStatus).toLowerCase().trim();

  let actionText = '';
  if (['downpayment_received', 'in_fabrication', 'installation_wip'].includes(s) && deltas.deltaSlabCount < 0) {
    actionText = `Downpayment confirmed. Automatically deducted ${slabs} physical slab(s) of ${materialName} from warehouse stock for fabrication. Stock remaining: ${updated.slabCount} slab(s).`;
  } else if (s === 'completed') {
    actionText = `Project completed and installed. Finalized fulfillment of ${slabs} slab(s) of ${materialName}. Physical warehouse stock: ${updated.slabCount} slab(s).`;
  } else if (s === 'cancelled' && deltas.deltaSlabCount > 0) {
    actionText = `Quotation cancelled. Automatically returned ${slabs} slab(s) of ${materialName} to warehouse stock. Physical warehouse stock restored to: ${updated.slabCount} slab(s).`;
  } else if (s === 'cancelled' && deltas.deltaSoftHold < 0) {
    actionText = `Quotation cancelled. Released 7-day soft hold on ${slabs} slab(s) of ${materialName}. Available: ${updated.available} slab(s).`;
  } else if (deltas.deltaSoftHold > 0) {
    actionText = `Quotation received. Automatically placed 7-day soft hold on ${slabs} slab(s) of ${materialName}. Available remaining: ${updated.available} slab(s).`;
  } else {
    actionText = `Inventory automatically adjusted for ${materialName} (${slabs} slab(s)). Physical warehouse stock: ${updated.slabCount} slab(s).`;
  }

  return {
    text: actionText,
    timestamp: new Date().toISOString(),
    author: 'Inventory Engine',
  };
}

/**
 * Evaluates whether Six Sigmaphil warehouse inventory can supplement/fulfill a quotation.
 * 
 * Compares required raw stone slabs against live available warehouse stock,
 * generating actionable fulfillment advisories and recommending in-stock stone alternatives
 * when inventory is insufficient.
 * 
 * @param {Object} request - Quotation request record
 * @param {Array} materials - Catalog of materials with stock metrics
 * @returns {Object} Feasibility assessment with badges, advice, and recommendations
 */
export function checkStockSupplementFeasibility(request, materials = []) {
  if (!request?.design) {
    return {
      status: 'unlisted',
      canSupplement: false,
      badge: 'No Stone Specified',
      shortLabel: 'Unspecified',
      badgeColor: '#6B7280',
      badgeBg: '#F3F4F6',
      badgeBorder: '#D1D5DB',
      message: 'No specific stone design was selected for this quotation.',
      availableSlabs: 0,
      requiredSlabs: 1,
      alternatives: [],
    };
  }

  const stoneName = String(request.design).trim().toLowerCase();
  const mat = Array.isArray(materials)
    ? materials.find((m) => String(m.name || '').trim().toLowerCase() === stoneName)
    : null;

  const requiredSlabs = Math.max(
    1,
    Number(request.required_slabs) || Math.ceil((Number(request.area || 0) * 1.15) / 4.35)
  );

  if (!mat) {
    return {
      status: 'unlisted',
      canSupplement: false,
      badge: 'Unlisted Stone',
      shortLabel: 'Unlisted',
      badgeColor: '#6B7280',
      badgeBg: '#F3F4F6',
      badgeBorder: '#D1D5DB',
      message: `Stone design "${request.design}" is not currently in the warehouse catalog. Custom quarry sourcing required.`,
      availableSlabs: 0,
      requiredSlabs,
      alternatives: [],
    };
  }

  const slabCount = typeof mat.slab_count === 'number' ? mat.slab_count : (Number(mat.slab_count) || 10);
  const softHold = typeof mat.soft_hold_slabs === 'number' ? mat.soft_hold_slabs : (Number(mat.soft_hold_slabs) || 0);

  // If this quotation itself is already in soft_hold or has already deducted its slabs,
  // do not count its own demand against itself
  const isHeld = ['pending', 'inspection_scheduled', 'inspection_completed', 'approved', 'in-review'].includes(request.status);
  const isDeducted = ['downpayment_received', 'in_fabrication', 'installation_wip', 'completed'].includes(request.status);

  if (isDeducted) {
    return {
      status: 'can_supplement',
      canSupplement: true,
      badge: 'Stock Secured',
      shortLabel: 'Deducted & Ready',
      badgeColor: '#047857',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0',
      message: `Stock Secured: ${requiredSlabs} slab(s) of ${mat.name} deducted from warehouse stock for fabrication. Remaining physical warehouse stock: ${slabCount} slab(s).`,
      availableSlabs: slabCount,
      requiredSlabs,
      alternatives: [],
    };
  }

  let effectiveSoftHold = softHold;
  if (isHeld) {
    effectiveSoftHold = Math.max(0, softHold - requiredSlabs);
  }

  const netAvailable = Math.max(0, slabCount - effectiveSoftHold);

  if (netAvailable >= requiredSlabs) {
    return {
      status: 'can_supplement',
      canSupplement: true,
      badge: 'Can Supplement',
      shortLabel: 'Sufficient Stock',
      badgeColor: '#047857',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0',
      message: `Sufficient Warehouse Stock: ${netAvailable} slab(s) available (${requiredSlabs} required). Six Sigmaphil can fully supplement and fabricate this quotation immediately upon downpayment confirmation.`,
      availableSlabs: netAvailable,
      requiredSlabs,
      alternatives: [],
    };
  } else if (netAvailable > 0) {
    return {
      status: 'partial_stock',
      canSupplement: false,
      badge: 'Partial Stock',
      shortLabel: 'Partial Stock',
      badgeColor: '#B45309',
      badgeBg: '#FFFBEB',
      badgeBorder: '#FDE68A',
      message: `Partial Warehouse Stock: ${netAvailable} of ${requiredSlabs} slab(s) ready. Quarry replenishment needed for the remaining ${requiredSlabs - netAvailable} slab(s) or recommend adjusting cut layout.`,
      availableSlabs: netAvailable,
      requiredSlabs,
      alternatives: [],
    };
  } else {
    // Locate in-stock alternative stones from warehouse catalog
    const alternatives = Array.isArray(materials)
      ? materials
          .filter((m) => {
            const mName = String(m.name || '').trim().toLowerCase();
            if (mName === stoneName) return false;
            const mCount = Number(m.slab_count) || 0;
            const mAlloc = Number(m.allocated_slabs) || 0;
            const mHold = Number(m.soft_hold_slabs) || 0;
            const mAvail = Math.max(0, mCount - mAlloc - mHold);
            return mAvail >= requiredSlabs;
          })
          .map((m) => m.name)
          .slice(0, 3)
      : [];

    return {
      status: 'insufficient_stock',
      canSupplement: false,
      badge: 'Insufficient Stock',
      shortLabel: 'Out of Stock',
      badgeColor: '#BE123C',
      badgeBg: '#FFF1F2',
      badgeBorder: '#FECDD3',
      message: `Out of Warehouse Stock: 0 slabs currently available. Cannot supplement from on-hand inventory without quarry shipment (lead time: 2–3 weeks).${
        alternatives.length > 0
          ? ` Recommended in-stock alternatives ready for immediate fabrication: ${alternatives.join(', ')}.`
          : ''
      }`,
      availableSlabs: 0,
      requiredSlabs,
      alternatives,
    };
  }
}

