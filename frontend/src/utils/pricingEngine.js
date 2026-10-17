/**
 * pricingEngine.js
 * Centralized pricing calculation engine for SIX SIGMAPHIL.
 * Implements the official rate schedule stored in Supabase `labor_rates` and `materials`.
 */

export const DEFAULT_LABOR_RATES = {
  base_installation: 1300,  // ₱ / sqm (countertops, flooring)
  wall_cladding: 2600,      // ₱ / sqm (wall cladding w/ stainless steel anchors)
  cutting: 250,             // ₱ / linear meter (perimeter fabrication)
  edge_polishing: 800,      // ₱ / linear meter (countertops / islands)
  mitering: 900,            // ₱ / linear meter (countertops / islands)
  sink_cutout: 2500,        // ₱ / set (sink & faucet hole cutout)
  cooktop_cutout: 1800,     // ₱ / set (cooktop hole cutout)
  delivery_cost: 3000,      // ₱ flat delivery fee
  mobilization_cost: 2000,  // ₱ flat mobilization fee
  vat_percentage: 12,       // 12% VAT
};

/**
 * Checks whether a given model structure is a countertop, island, or vanity
 * requiring edge polishing and mitering finishing.
 */
export function isCountertopStructure(name = '', structureType = '') {
  const n = (name || '').toLowerCase();
  const t = (structureType || '').toLowerCase();
  if (isWallStructure(name, structureType) || isFlooringStructure(name, structureType)) {
    return false;
  }
  return (
    n.includes('counter') ||
    n.includes('island') ||
    n.includes('kitchen') ||
    n.includes('vanity') ||
    n.includes('bar') ||
    n.includes('table') ||
    n.includes('bathroom') ||
    t === 'countertop' ||
    t === 'island'
  );
}

/**
 * Checks whether a structure is a wall cladding slab.
 */
export function isWallStructure(name = '', structureType = '') {
  const n = (name || '').toLowerCase();
  const t = (structureType || '').toLowerCase();
  return n.includes('wall') || n.includes('cladding') || t === 'wall';
}

/**
 * Checks whether a structure is a flooring installation.
 */
export function isFlooringStructure(name = '', structureType = '') {
  const n = (name || '').toLowerCase();
  const t = (structureType || '').toLowerCase();
  return (
    n.includes('floor') ||
    n.includes('flooring') ||
    n.includes('tile') ||
    n.includes('paving') ||
    n.includes('ground') ||
    t === 'floor' ||
    t === 'flooring'
  );
}

/**
 * Resolves standard category for any structure or product name.
 * Returns 'countertop' | 'island' | 'wall' | 'flooring'
 */
export function getStructureCategory(name = '', structureType = '') {
  if (isWallStructure(name, structureType)) return 'wall';
  if (isFlooringStructure(name, structureType)) return 'flooring';
  const n = (name || '').toLowerCase();
  const t = (structureType || '').toLowerCase();
  if (t === 'island' || n.includes('island')) return 'island';
  return 'countertop';
}

/**
 * Calculates the required number of raw stone slabs (jumbo 3.2m x 1.6m default)
 * incorporating a 15% fabrication waste, kerf, and cutout margin.
 *
 * @param {number} areaSqm - Client net countertop area in square meters
 * @param {number} [slabUsableArea=4.35] - Usable square meters per jumbo slab (5.12 sqm gross * 0.85 usable)
 * @returns {number} Minimum integer slabs required (at least 1)
 */
export function calculateRequiredSlabs(areaSqm = 0, slabUsableArea = 4.35) {
  const area = Math.max(Number(areaSqm) || 0, 0);
  const grossArea = area * 1.15; // 15% fabrication waste / kerf
  return Math.max(1, Math.ceil(grossArea / (Number(slabUsableArea) || 4.35)));
}

/**
 * Calculates a complete itemized pricing breakdown matching the official
 * Six Sigmaphil quotation rules and Supabase database rates.
 *
 * @param {Object} params
 * @param {number} params.length - Length in meters
 * @param {number} params.width - Width in meters
 * @param {number} [params.area] - Optional explicit area override (sqm)
 * @param {number} [params.cuttingLength] - Optional cutting / perimeter override (lm)
 * @param {number} [params.exposedLength] - Optional exposed edge finishing override (lm)
 * @param {number} [params.sinkHoles=0] - Sink & faucet hole cutout count (sets)
 * @param {number} [params.cooktopHoles=0] - Cooktop hole cutout count (sets)
 * @param {string} [params.structureName] - Model name (e.g. 'Kitchen Countertop')
 * @param {string} [params.structureType] - Structure type ('countertop', 'island', 'wall', 'floor')
 * @param {string} [params.projectCategory] - Explicit category ('countertop', 'wall', 'flooring')
 * @param {number} [params.pricePerSqm] - Stone material rate per sqm
 * @param {Object} [params.laborRates] - Live rates map from Supabase `labor_rates` table
 * @param {boolean} [params.includeLogistics=false] - Whether to include flat delivery & mobilization
 * @param {number|null} [params.deliveryCost=null] - Explicit delivery fee override
 * @param {number|null} [params.mobilizationCost=null] - Explicit mobilization fee override
 * @param {number} [params.discountPercent=0] - Discount percentage (0 - 100)
 * @param {boolean} [params.isVatIncluded=true] - Whether VAT is included in total
 * @param {number} [params.slabUsableArea=4.35] - Usable area per raw slab
 * @returns {Object} Complete itemized costs, subtotals, and total
 */
export function calculatePricing({
  length = 0,
  width = 0,
  area = null,
  cuttingLength = null,
  exposedLength = null,
  finishingLength = null,
  sinkHoles = 0,
  cooktopHoles = 0,
  structureName = '',
  structureType = '',
  projectCategory = null,
  pricePerSqm = 0,
  laborRates = null,
  includeLogistics = false,
  deliveryCost = null,
  mobilizationCost = null,
  discountType = 'percent', // 'percent' | 'amount'
  discountPercent = 0,
  discountAmount = 0,
  isVatIncluded = true,
  slabUsableArea = 4.35,
}) {
  const len = Math.max(Number(length) || 0, 0);
  const wid = Math.max(Number(width) || 0, 0);

  // Area: use manual override if provided and non-empty, otherwise len * wid
  const computedArea =
    area !== null && area !== undefined && area !== ''
      ? Math.max(Number(area) || 0, 0)
      : len * wid;

  const rates = {
    ...DEFAULT_LABOR_RATES,
    ...(laborRates || {}),
  };

  // Determine structure type / category
  const resolvedCategory = projectCategory || getStructureCategory(structureName, structureType);
  const isWall = resolvedCategory === 'wall';
  const isFlooring = resolvedCategory === 'flooring';
  const isCountertop = resolvedCategory === 'countertop' || resolvedCategory === 'island';

  // 1. Stone Material Cost (₱ / sqm)
  const matRate = Math.max(Number(pricePerSqm) || 0, 0);
  const materialCost = computedArea * matRate;

  // 2. Installation Cost (₱ / sqm)
  // Wall Cladding rate (₱2,600/sqm with stainless steel anchor) if wall,
  // or Base Installation rate (₱1,300/sqm) if countertop or flooring
  const installRate = isWall
    ? Number(rates.wall_cladding || 2600)
    : Number(rates.base_installation || 1300);
  const installCost = computedArea * installRate;

  // 3. Fabrication: Cutting (₱ / linear meter of perimeter)
  const perimeter =
    cuttingLength !== null && cuttingLength !== undefined && cuttingLength !== ''
      ? Math.max(Number(cuttingLength) || 0, 0)
      : 2 * (len + wid);
  const cuttingRate = Number(rates.cutting || 250);
  const cuttingCost = perimeter * cuttingRate;

  // 4. Edge Polishing & Mitering (₱ / linear meter of exposed length for countertops)
  const candidateExposed =
    exposedLength !== null && exposedLength !== undefined && exposedLength !== ''
      ? exposedLength
      : finishingLength;
  const exposed =
    candidateExposed !== null && candidateExposed !== undefined && candidateExposed !== ''
      ? Math.max(Number(candidateExposed) || 0, 0)
      : (isCountertop ? len : 0);

  const edgeRate = isCountertop ? Number(rates.edge_polishing || 800) : 0;
  const miteringRate = isCountertop ? Number(rates.mitering || 900) : 0;
  const edgePolishingCost = exposed * edgeRate;
  const miteringCost = exposed * miteringRate;

  // 5. Cutouts: Sink & Faucet hole count (@ ₱2,500), Cooktop hole count (@ ₱1,800)
  // Cutouts only apply to countertop structures
  const sinkQty = isCountertop ? Math.max(0, parseInt(sinkHoles, 10) || 0) : 0;
  const sinkRate = Number(rates.sink_cutout || 2500);
  const sinkCutoutCost = sinkQty * sinkRate;

  const cooktopQty = isCountertop ? Math.max(0, parseInt(cooktopHoles, 10) || 0) : 0;
  const cooktopRate = Number(rates.cooktop_cutout || 1800);
  const cooktopCutoutCost = cooktopQty * cooktopRate;

  const totalCutoutCost = sinkCutoutCost + cooktopCutoutCost;

  // Total Fabrication Cost
  const totalFabricationCost = cuttingCost + miteringCost + edgePolishingCost + totalCutoutCost;

  // 6. Logistics (Delivery & Mobilization)
  const standardDeliveryCost = Number(rates.delivery_cost || 3000);
  const standardMobilizationCost = Number(rates.mobilization_cost || 2000);

  const finalDeliveryCost =
    deliveryCost !== null && deliveryCost !== undefined
      ? Math.max(0, Number(deliveryCost) || 0)
      : (includeLogistics ? standardDeliveryCost : 0);

  const finalMobilizationCost =
    mobilizationCost !== null && mobilizationCost !== undefined
      ? Math.max(0, Number(mobilizationCost) || 0)
      : (includeLogistics ? standardMobilizationCost : 0);

  // 7. Subtotal (Material + Fabrication + Installation)
  const discountableCosts = materialCost + totalFabricationCost + installCost;
  const nonDiscountableCosts = finalDeliveryCost + finalMobilizationCost;
  const subtotal = discountableCosts;

  // 8. Discount & Net Amount (% or fixed amount in PHP)
  const isAmountDiscount = discountType === 'amount' || (Number(discountAmount) > 0 && !discountPercent);
  const finalDiscountAmount = isAmountDiscount
    ? Math.min(subtotal, Math.max(0, Number(discountAmount) || 0))
    : subtotal * (Math.min(100, Math.max(0, Number(discountPercent) || 0)) / 100);
  const finalDiscountPercent = isAmountDiscount
    ? (subtotal > 0 ? (finalDiscountAmount / subtotal) * 100 : 0)
    : Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const netAmount = subtotal - finalDiscountAmount;

  // 9. Net Amount including Logistics
  const netWithLogistics = netAmount + nonDiscountableCosts;

  // 10. Value-Added Tax (VAT) & Total Contract Amount
  const vatRate = Number(rates.vat_percentage || 12);
  const vatCost = isVatIncluded ? netWithLogistics * (vatRate / 100) : 0;
  const total = netWithLogistics + vatCost;

  // 11. Slab Yield Estimation (15% kerf / fabrication waste)
  const requiredSlabs = calculateRequiredSlabs(computedArea, slabUsableArea);

  return {
    length: len,
    width: wid,
    area: computedArea,
    perimeter,
    cuttingLength: perimeter,
    exposedLength: exposed,
    isWall,
    isFlooring,
    isCountertop,
    projectCategory: resolvedCategory,
    // Rates & Itemized Costs
    pricePerSqm: matRate,
    materialCost,
    installRate,
    installCost,
    cuttingRate,
    cuttingCost,
    edgeRate,
    edgePolishingCost,
    miteringRate,
    miteringCost,
    sinkHoles: sinkQty,
    sinkRate,
    sinkCutoutCost,
    cooktopHoles: cooktopQty,
    cooktopRate,
    cooktopCutoutCost,
    totalCutoutCost,
    fabricationCost: totalFabricationCost,
    totalFabricationCost,
    // Logistics
    includeLogistics,
    standardDeliveryCost,
    standardMobilizationCost,
    deliveryCost: finalDeliveryCost,
    mobilizationCost: finalMobilizationCost,
    // Subtotals, Discount & Net
    discountableCosts,
    nonDiscountableCosts,
    subtotal,
    discountType: isAmountDiscount ? 'amount' : 'percent',
    discountPercent: finalDiscountPercent,
    discountAmount: finalDiscountAmount,
    netAmount,
    netWithLogistics,
    finishingLength: isCountertop ? exposed : perimeter,
    // Taxes & Total Contract Amount
    isVatIncluded: Boolean(isVatIncluded),
    vatRate,
    vatCost,
    total,
    totalContractAmount: total,
    // Slabs
    requiredSlabs,
    grossArea: computedArea * 1.15,
  };
}
