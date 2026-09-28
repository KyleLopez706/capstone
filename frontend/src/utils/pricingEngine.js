/**
 * pricingEngine.js
 * Centralized pricing calculation engine for SIX SIGMAPHIL.
 * Implements the official rate schedule stored in Supabase `labor_rates` and `materials`.
 */

export const DEFAULT_LABOR_RATES = {
  base_installation: 1300,  // ₱ / sqm
  wall_cladding: 2600,      // ₱ / sqm
  cutting: 250,             // ₱ / linear meter (perimeter fabrication)
  edge_polishing: 800,      // ₱ / linear meter (countertops / islands)
  mitering: 900,            // ₱ / linear meter (countertops / islands)
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
  return (
    n.includes('counter') ||
    n.includes('top') ||
    n.includes('island') ||
    n.includes('kitchen') ||
    n.includes('vanity') ||
    n.includes('bar') ||
    n.includes('bathroom') ||
    n.includes('lobby') ||
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
 * Calculates a complete itemized pricing breakdown matching the official
 * Six Sigmaphil quotation rules and Supabase database rates.
 *
 * @param {Object} params
 * @param {number} params.length - Length in meters
 * @param {number} params.width - Width in meters
 * @param {string} [params.structureName] - Model name (e.g. 'Kitchen Countertop')
 * @param {string} [params.structureType] - Structure type ('countertop', 'island', 'wall', 'floor')
 * @param {number} [params.pricePerSqm] - Stone material rate per sqm
 * @param {Object} [params.laborRates] - Live rates map from Supabase `labor_rates` table
 * @returns {Object} Complete itemized costs, subtotals, and total
 */
export function calculatePricing({
  length = 0,
  width = 0,
  structureName = '',
  structureType = '',
  pricePerSqm = 0,
  laborRates = null,
}) {
  const len = Math.max(Number(length) || 0, 0);
  const wid = Math.max(Number(width) || 0, 0);
  const area = len * wid;

  const rates = {
    ...DEFAULT_LABOR_RATES,
    ...(laborRates || {}),
  };

  const isWall = isWallStructure(structureName, structureType);
  const isCountertop = isCountertopStructure(structureName, structureType);

  // 1. Stone Material Cost (₱ / sqm)
  const matRate = Math.max(Number(pricePerSqm) || 0, 0);
  const materialCost = area * matRate;

  // 2. Installation Cost (₱ / sqm)
  const installRate = isWall ? Number(rates.wall_cladding || 2600) : Number(rates.base_installation || 1300);
  const installCost = area * installRate;

  // 3. Fabrication / Cutting (₱ / linear meter of full perimeter)
  const perimeter = 2 * (len + wid);
  const cuttingRate = Number(rates.cutting || 250);
  const fabricationCost = perimeter * cuttingRate;

  // 4. Edge Polishing & Mitering (₱ / linear meter of exposed front length)
  const edgeRate = isCountertop ? Number(rates.edge_polishing || 800) : 0;
  const miteringRate = isCountertop ? Number(rates.mitering || 900) : 0;
  const edgePolishingCost = len * edgeRate;
  const miteringCost = len * miteringRate;

  // 5. Fixed Logistics
  const deliveryCost = Number(rates.delivery_cost || 3000);
  const mobilizationCost = Number(rates.mobilization_cost || 2000);

  // Subtotals (Material + Fabrication + Installation + Finishing + Logistics)
  const discountableCosts = materialCost + fabricationCost + installCost + edgePolishingCost + miteringCost;
  const nonDiscountableCosts = deliveryCost + mobilizationCost;
  const subtotal = discountableCosts + nonDiscountableCosts;

  // 6. Value-Added Tax (VAT)
  const vatRate = Number(rates.vat_percentage || 12);
  const vatCost = subtotal * (vatRate / 100);

  // Grand Total
  const total = subtotal + vatCost;

  return {
    length: len,
    width: wid,
    area,
    perimeter,
    isWall,
    isCountertop,
    // Rates & Itemized Costs
    pricePerSqm: matRate,
    materialCost,
    installRate,
    installCost,
    cuttingRate,
    fabricationCost,
    edgeRate,
    edgePolishingCost,
    miteringRate,
    miteringCost,
    deliveryCost,
    mobilizationCost,
    discountableCosts,
    nonDiscountableCosts,
    subtotal,
    vatRate,
    vatCost,
    total,
  };
}
