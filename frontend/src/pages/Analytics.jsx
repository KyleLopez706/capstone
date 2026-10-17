import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

/* ── Stock Status Badge Resolver ── */
function getStockBadge(status) {
  switch (status) {
    case 'available':
      return { label: 'In Stock', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    case 'limited_stock':
      return { label: 'Limited Stock', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    case 'restocking_soon':
      return { label: 'Restocking Soon', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    case 'out_of_stock':
      return { label: 'Out of Stock', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    default:
      return { label: 'Active', bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
  }
}

/* ── Structure Type Badge Resolver ── */
function getStructureBadge(type) {
  switch (type) {
    case 'countertop':
      return { label: 'Countertop', bg: '#FDF8F0', text: '#C5A059', border: '#EFE7C6' };
    case 'island':
      return { label: 'Kitchen Island', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    case 'wall':
      return { label: 'Wall Cladding', bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
    case 'floor':
      return { label: 'Flooring', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    default:
      return { label: type || 'Structure', bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
  }
}

/* ─────────────────────────────────────────────────────────────
   DISTINCT LUXURY COLOR PALETTES
   Vibrant, high-contrast, yet refined colors adhering to
   the Six Sigmaphil design standards.
───────────────────────────────────────────────────────────── */
const PRODUCT_COLORS = [
  '#C5A059', // Champagne Gold
  '#2563EB', // Sapphire Blue
  '#059669', // Emerald Jade
  '#D97706', // Warm Amber
  '#7C3AED', // Royal Violet
  '#DC2626', // Ruby Crimson
  '#0D9488', // Deep Teal
  '#475569', // Slate Steel
];

const PIE_COLORS = [
  '#C5A059', // Champagne Gold
  '#3B82F6', // Cobalt Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Bright Amber
  '#8B5CF6', // Purple Orchid
  '#EC4899', // Rose Pink
  '#06B6D4', // Cyan Teal
  '#64748B', // Cool Slate
];

/* ── Custom Tooltip for Bar Chart ── */
function CustomBarTooltip({ active, payload, metric }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isValue = metric === 'value';
    return (
      <div
        style={{
          backgroundColor: '#232B32',
          border: '1px solid rgba(197,160,89,0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}
      >
        <p style={{ color: '#F9F9FB', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
          {data.name}
        </p>
        <p style={{ color: '#C5A059', fontSize: '12px', fontWeight: 600 }}>
          {isValue
            ? `Total Value: ₱${Number(data.totalValue).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `Requests: ${data.count} units`}
        </p>
        {!isValue && data.totalValue > 0 && (
          <p style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '2px' }}>
            Estimated: ₱{Number(data.totalValue).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
    );
  }
  return null;
}

/* ── Custom Tooltip for Pie Chart ── */
function CustomPieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: '#232B32',
          border: '1px solid rgba(197,160,89,0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}
      >
        <p style={{ color: '#F9F9FB', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
          {data.name}
        </p>
        <p style={{ color: '#C5A059', fontSize: '12px', fontWeight: 600 }}>
          {data.value} projects ({data.percentage}%)
        </p>
        {data.totalValue > 0 && (
          <p style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '2px' }}>
            Total: ₱{Number(data.totalValue).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default function Analytics() {
  const [requests, setRequests] = useState([]);
  const [catalogMaterials, setCatalogMaterials] = useState([]);
  const [catalogStructures, setCatalogStructures] = useState([]);
  const [stoneTab, setStoneTab] = useState('chart'); // 'chart' | 'catalog'
  const [projectTab, setProjectTab] = useState('category'); // 'category' | 'models'
  const [stoneSearch, setStoneSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  /* ── Interactive Filter States ── */
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [timeFilter, setTimeFilter]           = useState('all'); // 'all' | '30d' | '90d' | 'year'
  const [statusFilter, setStatusFilter]       = useState('all'); // 'all' | 'approved' | 'pending'
  const [typeFilter, setTypeFilter]           = useState('all'); // 'all' | specific product_type
  const [metric, setMetric]                   = useState('count'); // 'count' | 'value'

  /* ── Fetch all data from Supabase with Realtime Live Sync across Quotes, Materials, and 3D Models ── */
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [reqRes, matRes, structRes] = await Promise.all([
        supabase
          .from('quotation_requests')
          .select('id, request_id, product_type, design, created_at, status, total_cost, area, length, width')
          .order('created_at', { ascending: false }),
        supabase
          .from('materials')
          .select('id, name, price_per_sqm, color_url, hex_code, stock_status, slab_count')
          .order('name'),
        supabase
          .from('structures')
          .select('id, name, structure_type, model_url, base_length, base_width')
          .order('name'),
      ]);

      if (reqRes.data) setRequests(reqRes.data);
      if (matRes.data) setCatalogMaterials(matRes.data);
      if (structRes.data) setCatalogStructures(structRes.data);
    } catch (err) {
      console.error('[Analytics] Error:', err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Listen in real-time for changes in quotation_requests, materials, and 3D models
    const channel = supabase
      .channel('analytics-realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotation_requests' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'structures' }, () => fetchAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  /* Extract distinct project types and 3D models for dropdown filter (strictly active structures) */
  const allProjectTypes = useMemo(() => {
    const set = new Set();
    set.add('Kitchen Countertop');
    set.add('Kitchen Island');
    set.add('Wall Cladding');
    set.add('Flooring');

    catalogStructures.forEach(s => {
      if (s.name) set.add(s.name.trim());
    });

    return Array.from(set).sort();
  }, [catalogStructures]);

  /* ── Filtered Requests based on active filters ── */
  const filteredRequests = useMemo(() => {
    const now = new Date();

    return requests.filter(r => {
      // 1. Time Filter
      if (timeFilter !== 'all' && r.created_at) {
        const createdAt = new Date(r.created_at);
        const diffMs = now - createdAt;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (timeFilter === '30d' && diffDays > 30) return false;
        if (timeFilter === '90d' && diffDays > 90) return false;
        if (timeFilter === 'year' && createdAt.getFullYear() !== now.getFullYear()) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        const s = (r.status || 'pending').toLowerCase();
        if (statusFilter === 'approved' && s !== 'approved') return false;
        if (statusFilter === 'pending' && s !== 'pending') return false;
      }

      // 3. Project Type Filter (supports category and 3D model names)
      if (typeFilter !== 'all') {
        const rType = (r.product_type || '').toLowerCase();
        const fType = typeFilter.toLowerCase();

        let rCategory = 'Kitchen Countertop';
        if (rType.includes('island')) rCategory = 'Kitchen Island';
        else if (rType.includes('wall') || rType.includes('cladding')) rCategory = 'Wall Cladding';
        else if (rType.includes('floor')) rCategory = 'Flooring';

        const matchesCategory = typeFilter === rCategory;
        const matchesName = rType === fType || rType.includes(fType) || fType.includes(rType);

        if (!matchesCategory && !matchesName) {
          return false;
        }
      }

      return true;
    });
  }, [requests, timeFilter, statusFilter, typeFilter]);

  /* Count active non-default filters */
  const activeFilterCount = (timeFilter !== 'all' ? 1 : 0) +
                            (statusFilter !== 'all' ? 1 : 0) +
                            (typeFilter !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setTimeFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  /* ── Compute Analytics combining Live Requests, Catalog Stone Designs & 3D Models ── */
  const analytics = useMemo(() => {
    const designMap = {};
    const projectTypeMap = {
      'Kitchen Countertop': { count: 0, totalValue: 0 },
      'Kitchen Island': { count: 0, totalValue: 0 },
      'Wall Cladding': { count: 0, totalValue: 0 },
      'Flooring': { count: 0, totalValue: 0 },
    };
    const modelMap = {};
    let totalQuotations = filteredRequests.length;
    let totalValue = 0;
    let approvedCount = 0;

    // 1. Initialize designMap with strictly ACTIVE catalog stone designs from materials table
    catalogMaterials.forEach(m => {
      const name = m.name?.trim();
      if (name) {
        designMap[name] = {
          id: m.id,
          name,
          count: 0,
          totalValue: 0,
          inCatalog: true,
          pricePerSqm: Number(m.price_per_sqm) || 0,
          stockStatus: m.stock_status || 'available',
          colorUrl: m.color_url,
          slabCount: m.slab_count,
        };
      }
    });

    // 2. Initialize modelMap with strictly ACTIVE 3D models from structures table
    catalogStructures.forEach(s => {
      const sName = s.name?.trim();
      if (sName) {
        modelMap[sName] = {
          id: s.id,
          name: sName,
          structureType: s.structure_type,
          baseLength: s.base_length,
          baseWidth: s.base_width,
          count: 0,
          totalValue: 0,
          inCatalog: true,
          modelUrl: s.model_url,
        };
      }
    });

    // 3. Aggregate filtered requests
    filteredRequests.forEach(r => {
      const cost = Number(r.total_cost) || 0;
      totalValue += cost;
      if (r.status === 'approved') approvedCount++;

      // Aggregate designs strictly if the stone design exists in catalogMaterials (deleted stones are omitted)
      const d = (r.design || '').trim();
      const matchedMat = catalogMaterials.find(m => m.name.toLowerCase() === d.toLowerCase());
      if (matchedMat && designMap[matchedMat.name]) {
        designMap[matchedMat.name].count += 1;
        designMap[matchedMat.name].totalValue += cost;
      }

      // Aggregate 3D models strictly for active models in catalogStructures
      const rType = (r.product_type || '').trim().toLowerCase();
      const matchedModel =
        catalogStructures.find(s => s.name.toLowerCase() === rType) ||
        catalogStructures.find(s => rType.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(rType)) ||
        catalogStructures.find(s => {
          if (rType.includes('bath') && s.name.toLowerCase().includes('bath')) return true;
          if (rType.includes('island') && s.structure_type === 'island') return true;
          if ((rType.includes('wall') || rType.includes('cladding')) && s.structure_type === 'wall') return true;
          if (rType.includes('floor') && s.structure_type === 'floor') return true;
          if (s.structure_type === 'countertop' && s.name.toLowerCase().includes('kitchen')) return true;
          return false;
        });

      if (matchedModel && modelMap[matchedModel.name]) {
        modelMap[matchedModel.name].count += 1;
        modelMap[matchedModel.name].totalValue += cost;
      }

      // Aggregate project types: Normalize to canonical categories based on matched 3D model's structure_type, or keyword fallback
      let pt = 'Kitchen Countertop';
      if (matchedModel?.structure_type) {
        if (matchedModel.structure_type === 'island') pt = 'Kitchen Island';
        else if (matchedModel.structure_type === 'wall') pt = 'Wall Cladding';
        else if (matchedModel.structure_type === 'floor') pt = 'Flooring';
        else pt = 'Kitchen Countertop';
      } else {
        const ptLower = rType;
        if (ptLower.includes('island')) {
          pt = 'Kitchen Island';
        } else if (ptLower.includes('wall') || ptLower.includes('cladding')) {
          pt = 'Wall Cladding';
        } else if (ptLower.includes('floor')) {
          pt = 'Flooring';
        } else {
          // All countertop/kitchen shapes (u-shape, l-shape, bar, vanity, etc.) normalize to Kitchen Countertop
          pt = 'Kitchen Countertop';
        }
      }

      if (projectTypeMap[pt]) {
        projectTypeMap[pt].count += 1;
        projectTypeMap[pt].totalValue += cost;
      }
    });

    const isValMetric = metric === 'value';

    // Top stone designs for the Bar Chart (strictly active catalog stones with quote value)
    const popularProducts = Object.values(designMap)
      .filter(data => data.inCatalog && (isValMetric ? data.totalValue : data.count) > 0)
      .map(data => ({
        ...data,
        chartValue: isValMetric ? data.totalValue : data.count,
      }))
      .sort((a, b) => b.chartValue - a.chartValue)
      .slice(0, 8);

    // If no quotes exist yet, preview active catalog stones with 0
    if (popularProducts.length === 0 && catalogMaterials.length > 0) {
      catalogMaterials.slice(0, 6).forEach(m => {
        popularProducts.push({
          name: m.name,
          count: 0,
          totalValue: 0,
          chartValue: 0,
          inCatalog: true,
          pricePerSqm: Number(m.price_per_sqm) || 0,
          stockStatus: m.stock_status,
        });
      });
    }

    // Full catalog list of stones (strictly active catalog stones)
    const allCatalogStones = Object.values(designMap)
      .filter(data => data.inCatalog)
      .sort((a, b) => {
        const valA = isValMetric ? a.totalValue : a.count;
        const valB = isValMetric ? b.totalValue : b.count;
        if (valB !== valA) return valB - valA;
        return a.name.localeCompare(b.name);
      });

    // Project types for Donut Chart
    const projectTypes = Object.entries(projectTypeMap)
      .map(([name, data]) => ({
        name,
        value: data.count,
        totalValue: data.totalValue,
        percentage: totalQuotations > 0 ? Math.round((data.count / totalQuotations) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // 3D Models insights (strictly active 3D models from structures table)
    const modelInsights = Object.values(modelMap)
      .filter(m => m.inCatalog)
      .map(data => ({
        ...data,
        percentage: totalQuotations > 0 ? Math.round((data.count / totalQuotations) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const avgValue = totalQuotations > 0 ? Math.round(totalValue / totalQuotations) : 0;
    const approvalRate = totalQuotations > 0 ? Math.round((approvedCount / totalQuotations) * 100) : 0;

    return {
      totalQuotations,
      totalValue,
      approvedCount,
      approvalRate,
      avgValue,
      popularProducts,
      allCatalogStones,
      projectTypes,
      modelInsights,
    };
  }, [filteredRequests, metric, catalogMaterials, catalogStructures]);

  /* Quick insights text generation */
  let topDesignText = "No product data for selected filters";
  let runnerUpDesignText = "";
  let top5Text = "";
  if (analytics.popularProducts.length > 0 && analytics.popularProducts[0].chartValue > 0) {
    const top = analytics.popularProducts[0];
    topDesignText = metric === 'value'
      ? `${top.name} generates the highest revenue at ₱${Number(top.totalValue).toLocaleString('en-PH')} (${top.count} units)`
      : `${top.name} is the most requested design with ${top.count} quotations`;

    if (analytics.popularProducts.length > 1 && analytics.popularProducts[1].chartValue > 0) {
      const runner = analytics.popularProducts[1];
      runnerUpDesignText = metric === 'value'
        ? `${runner.name} is second with ₱${Number(runner.totalValue).toLocaleString('en-PH')} (${runner.count} units)`
        : `${runner.name} follows closely with ${runner.count} quotations`;
    }
    const topTotal = analytics.popularProducts.reduce((sum, d) => sum + (metric === 'value' ? d.totalValue : d.count), 0);
    top5Text = metric === 'value'
      ? `Top designs account for ₱${Number(topTotal).toLocaleString('en-PH')} in quotation value`
      : `Top designs account for ${topTotal} total units`;
  } else if (catalogMaterials.length > 0) {
    topDesignText = `${catalogMaterials.length} stone designs active in catalog ready for customer selection.`;
  }

  const projectInsights = analytics.projectTypes.map(pt => {
    return `${pt.name} projects represent ${pt.percentage}% (${pt.value} quotes · ₱${Number(pt.totalValue).toLocaleString('en-PH')})`;
  });

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#F9F9FB', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Page Header & Interactive Filter Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#232B32]">
              Product &amp; Project Insights
            </h2>
            <p className="text-xs md:text-sm text-[#6B7280] mt-0.5">
              Live performance metrics, popular stone designs, catalog additions, and project category distribution
            </p>
          </div>

          {/* Action buttons: Refresh & Filter Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAllData}
              disabled={dataLoading}
              title="Refresh all data across quotations, materials, and 3D models"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#C5A059] text-[#232B32] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 text-[#C5A059] ${dataLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowFilterPanel(prev => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
              style={{
                backgroundColor: showFilterPanel ? '#232B32' : '#FFFFFF',
                color: showFilterPanel ? '#F9F9FB' : '#232B32',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white"
                  style={{ backgroundColor: '#C5A059' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#C5A059] hover:underline"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* ── Interactive Filter Controls Drawer / Panel ── */}
        {showFilterPanel && (
          <div
            className="p-5 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm transition-all"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Time Range Filter */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">
                  Time Period
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0]">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: '30d', label: 'Past 30d' },
                    { id: '90d', label: 'Past 90d' },
                    { id: 'year', label: 'This Year' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTimeFilter(tab.id)}
                      className="py-1.5 px-2 text-xs font-semibold rounded-lg transition-all"
                      style={{
                        backgroundColor: timeFilter === tab.id ? '#232B32' : 'transparent',
                        color: timeFilter === tab.id ? '#F9F9FB' : '#6B7280',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">
                  Quotation Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl py-2.5 px-3.5 text-xs text-[#232B32] font-medium outline-none focus:border-[#C5A059] transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved Quotes Only</option>
                  <option value="pending">Pending Quotes Only</option>
                </select>
              </div>

              {/* Project Type Filter */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">
                  Structure / Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl py-2.5 px-3.5 text-xs text-[#232B32] font-medium outline-none focus:border-[#C5A059] transition-colors"
                >
                  <option value="all">All Structures ({allProjectTypes.length})</option>
                  {allProjectTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Bar Metric View Mode */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">
                  Chart Metric
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0]">
                  <button
                    onClick={() => setMetric('count')}
                    className="py-1.5 px-2 text-xs font-semibold rounded-lg transition-all"
                    style={{
                      backgroundColor: metric === 'count' ? '#C5A059' : 'transparent',
                      color: metric === 'count' ? '#FFFFFF' : '#6B7280',
                      cursor: 'pointer'
                    }}
                  >
                    Units (Count)
                  </button>
                  <button
                    onClick={() => setMetric('value')}
                    className="py-1.5 px-2 text-xs font-semibold rounded-lg transition-all"
                    style={{
                      backgroundColor: metric === 'value' ? '#C5A059' : 'transparent',
                      color: metric === 'value' ? '#FFFFFF' : '#6B7280',
                      cursor: 'pointer'
                    }}
                  >
                    Revenue (₱)
                  </button>
                </div>
              </div>

            </div>

            {/* Active Filter Indicators */}
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#9CA3AF] font-medium">Active:</span>
                <span className="px-2.5 py-1 rounded-full bg-[#F9F9FB] border border-[#E2E8F0] text-[#232B32] font-medium">
                  {timeFilter === 'all' ? 'All Time' : timeFilter === '30d' ? 'Past 30 Days' : timeFilter === '90d' ? 'Past 90 Days' : 'This Year'}
                </span>
                {statusFilter !== 'all' && (
                  <span className="px-2.5 py-1 rounded-full bg-[#F9F9FB] border border-[#E2E8F0] text-[#232B32] font-medium capitalize">
                    Status: {statusFilter}
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="px-2.5 py-1 rounded-full bg-[#F9F9FB] border border-[#E2E8F0] text-[#232B32] font-medium">
                    Type: {typeFilter}
                  </span>
                )}
              </div>
              <p className="text-[#6B7280] font-semibold">
                Showing {analytics.totalQuotations} of {requests.length} records
              </p>
            </div>
          </div>
        )}

        {/* ── Reactive KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Quotations */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#FDF8F0] rounded-xl shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Total Quotations
              </p>
              <p className="text-2xl font-bold text-[#232B32] mt-0.5">
                {dataLoading ? '...' : analytics.totalQuotations}
              </p>
            </div>
          </div>

          {/* 2. Total Estimated Value */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#ECFDF5] rounded-xl shrink-0 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 21V4h7a5 5 0 0 1 0 10H7"></path>
                <line x1="4" y1="7.5" x2="18" y2="7.5"></line>
                <line x1="4" y1="10.5" x2="18" y2="10.5"></line>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Estimated Value
              </p>
              <p className="text-2xl font-bold text-[#232B32] mt-0.5">
                {dataLoading ? '...' : `₱${Number(analytics.totalValue).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
              </p>
            </div>
          </div>

          {/* 3. Approved Quotations */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#EFF6FF] rounded-xl shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Approved Rate
              </p>
              <p className="text-2xl font-bold text-[#232B32] mt-0.5">
                {dataLoading ? '...' : `${analytics.approvalRate}%`}
                <span className="text-xs font-normal text-[#6B7280] ml-1.5">
                  ({analytics.approvedCount} approved)
                </span>
              </p>
            </div>
          </div>

          {/* 4. Average Quote Size */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#F5F3FF] rounded-xl shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Average Quote
              </p>
              <p className="text-2xl font-bold text-[#232B32] mt-0.5">
                {dataLoading ? '...' : `₱${Number(analytics.avgValue).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
              </p>
            </div>
          </div>

        </div>

        {/* ── Charts Grid (Multi-Color Edition with Sub-Tabs) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Card 1: Popular Stone Designs & Full Catalog Showcase */}
          <div
            style={{
              backgroundColor: '#ffffff', borderRadius: '16px',
              border: '1px solid #E2E8F0', padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#232B32]">
                    Popular Stone Designs
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F9F9FB] border border-[#E2E8F0] text-[#C5A059]">
                    {catalogMaterials.length} Designs
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  {stoneTab === 'chart'
                    ? (metric === 'value' ? 'Ranked by quotation revenue (₱)' : 'Ranked by customer quotation requests')
                    : 'All catalog stone designs, warehouse stock, and quotation demand'}
                </p>
              </div>

              {/* Sub-tab Switcher: Top Chart vs All Stones */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0]">
                  <button
                    onClick={() => setStoneTab('chart')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      stoneTab === 'chart'
                        ? 'bg-[#232B32] text-[#F9F9FB] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#232B32]'
                    }`}
                  >
                    Top Chart
                  </button>
                  <button
                    onClick={() => setStoneTab('catalog')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      stoneTab === 'catalog'
                        ? 'bg-[#232B32] text-[#F9F9FB] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#232B32]'
                    }`}
                  >
                    All Stones ({catalogMaterials.length})
                  </button>
                </div>

                {stoneTab === 'chart' && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-[#F9F9FB] border border-[#E2E8F0] text-[#C5A059]">
                    {metric === 'value' ? '₱ Revenue' : 'Units'}
                  </span>
                )}
              </div>
            </div>

            {stoneTab === 'chart' ? (
              <>
                <div style={{ width: '100%', height: '320px' }}>
                  {dataLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-xs text-gray-400">Loading chart...</p>
                    </div>
                  ) : analytics.popularProducts.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                      <p className="text-sm font-medium text-[#6B7280]">No matching data found</p>
                      <button onClick={handleResetFilters} className="text-xs text-[#C5A059] underline">
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.popularProducts}
                        margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#6B7280' }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#6B7280' }}
                          tickFormatter={(val) => {
                            if (metric !== 'value') return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val;
                            if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
                            if (val >= 1000) return `₱${(val / 1000).toFixed(0)}k`;
                            return `₱${val}`;
                          }}
                        />
                        <Tooltip content={<CustomBarTooltip metric={metric} />} />
                        <Bar
                          dataKey="chartValue"
                          radius={[6, 6, 0, 0]}
                          barSize={38}
                        >
                          {analytics.popularProducts.map((entry, index) => (
                            <Cell
                              key={`bar-${index}`}
                              fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Color Swatch Legend */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-3">
                  {analytics.popularProducts.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] }}
                      />
                      <span className="truncate max-w-[120px] font-medium text-[#232B32]">{item.name}</span>
                      <span className="text-[#9CA3AF]">
                        ({metric === 'value' ? `₱${(item.totalValue / 1000).toFixed(0)}k` : item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* All Catalog Stones Tab View */
              <div className="space-y-3">
                {/* Search in Catalog */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={stoneSearch}
                      onChange={(e) => setStoneSearch(e.target.value)}
                      placeholder="Search stone design..."
                      className="w-full text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl px-3 py-2 pl-8 text-[#232B32] outline-none focus:border-[#C5A059]"
                    />
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <a
                    href="/admin/materials"
                    className="text-[11px] font-bold text-[#C5A059] hover:underline whitespace-nowrap"
                  >
                    + Add New Stone ↗
                  </a>
                </div>

                {/* Scrollable Stones List */}
                <div className="max-h-[310px] overflow-y-auto space-y-2 pr-1">
                  {analytics.allCatalogStones
                    .filter(s => !stoneSearch.trim() || s.name.toLowerCase().includes(stoneSearch.toLowerCase().trim()))
                    .map((stone, idx) => {
                      const stockBadge = getStockBadge(stone.stockStatus);
                      return (
                        <div
                          key={stone.name}
                          className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] hover:border-[#C5A059]/40 bg-[#FFFFFF] hover:bg-[#F9F9FB] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Color Swatch / Texture Image */}
                            {stone.colorUrl ? (
                              <img
                                src={stone.colorUrl}
                                alt={stone.name}
                                className="w-9 h-9 rounded-lg object-cover border border-[#E2E8F0] shrink-0"
                              />
                            ) : (
                              <div
                                className="w-9 h-9 rounded-lg border border-[#E2E8F0] shrink-0 flex items-center justify-center font-bold text-[10px] text-white"
                                style={{ backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] }}
                              >
                                {stone.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-[#232B32] truncate">
                                  {stone.name}
                                </p>
                                {stone.count > 0 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30 shrink-0">
                                    {stone.count} quote{stone.count === 1 ? '' : 's'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] shrink-0">
                                    Newly Added
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6B7280]">
                                Rate: ₱{Number(stone.pricePerSqm).toLocaleString('en-PH')}/m²
                                {stone.slabCount !== undefined && ` · ${stone.slabCount} slab${stone.slabCount === 1 ? '' : 's'}`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-3">
                            <span
                              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
                              style={{
                                backgroundColor: stockBadge.bg,
                                color: stockBadge.text,
                                border: `1px solid ${stockBadge.border}`,
                              }}
                            >
                              {stockBadge.label}
                            </span>
                            <p className="text-xs font-bold text-[#232B32]">
                              ₱{Number(stone.totalValue).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Project Types & 3D Models Breakdown */}
          <div
            style={{
              backgroundColor: '#ffffff', borderRadius: '16px',
              border: '1px solid #E2E8F0', padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#232B32]">
                    Project Types &amp; 3D Models
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F9F9FB] border border-[#E2E8F0] text-[#C5A059]">
                    {catalogStructures.length} 3D Models
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  {projectTab === 'category'
                    ? 'Distribution across Countertops, Islands, Wall Cladding, and Flooring'
                    : 'Active Blender 3D models from catalog with demand and dimensions'}
                </p>
              </div>

              {/* Sub-tab Switcher: By Category vs 3D Models */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0]">
                  <button
                    onClick={() => setProjectTab('category')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      projectTab === 'category'
                        ? 'bg-[#232B32] text-[#F9F9FB] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#232B32]'
                    }`}
                  >
                    By Category
                  </button>
                  <button
                    onClick={() => setProjectTab('models')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      projectTab === 'models'
                        ? 'bg-[#232B32] text-[#F9F9FB] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#232B32]'
                    }`}
                  >
                    3D Models ({catalogStructures.length})
                  </button>
                </div>

                {projectTab === 'category' && typeFilter !== 'all' && (
                  <button
                    onClick={() => setTypeFilter('all')}
                    className="text-[11px] text-[#C5A059] font-bold underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {projectTab === 'category' ? (
              <>
                <div style={{ width: '100%', height: '320px' }}>
                  {dataLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-xs text-gray-400">Loading chart...</p>
                    </div>
                  ) : analytics.projectTypes.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-sm font-medium text-[#6B7280]">No matching projects</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.projectTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          onClick={(entry) => {
                            setTypeFilter(prev => prev === entry.name ? 'all' : entry.name);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {analytics.projectTypes.map((entry, index) => (
                            <Cell
                              key={`pie-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                              opacity={typeFilter === 'all' || typeFilter === entry.name ? 1 : 0.35}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Clickable Legend Pills */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
                  {analytics.projectTypes.map((item, idx) => {
                    const isSelected = typeFilter === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => setTypeFilter(prev => prev === item.name ? 'all' : item.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(197,160,89,0.15)' : '#F9F9FB',
                          border: isSelected ? '1px solid #C5A059' : '1px solid #E2E8F0',
                          color: isSelected ? '#C5A059' : '#6B7280',
                          cursor: 'pointer'
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="font-semibold text-[#232B32]">{item.name}</span>
                        <span>({item.percentage}%)</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* 3D Models Catalog Tab View */
              <div className="space-y-3">
                {/* Search in 3D Models */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search 3D model..."
                      className="w-full text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl px-3 py-2 pl-8 text-[#232B32] outline-none focus:border-[#C5A059]"
                    />
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <a
                    href="/admin/models"
                    className="text-[11px] font-bold text-[#C5A059] hover:underline whitespace-nowrap"
                  >
                    + Add 3D Model ↗
                  </a>
                </div>

                {/* Scrollable 3D Models List */}
                <div className="max-h-[310px] overflow-y-auto space-y-2 pr-1">
                  {analytics.modelInsights
                    .filter(m => !modelSearch.trim() || m.name.toLowerCase().includes(modelSearch.toLowerCase().trim()))
                    .map((model) => {
                      const structBadge = getStructureBadge(model.structureType);
                      return (
                        <div
                          key={model.name}
                          className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] hover:border-[#C5A059]/40 bg-[#FFFFFF] hover:bg-[#F9F9FB] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* 3D Model Box Icon */}
                            <div className="w-9 h-9 rounded-lg bg-[#232B32] text-[#C5A059] flex items-center justify-center shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                              </svg>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-[#232B32] truncate">
                                  {model.name}
                                </p>
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: structBadge.bg,
                                    color: structBadge.text,
                                    border: `1px solid ${structBadge.border}`,
                                  }}
                                >
                                  {structBadge.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#6B7280]">
                                Base: {model.baseLength || 2.4}m × {model.baseWidth || 0.6}m
                                {model.count > 0 && ` · ${model.count} quote${model.count === 1 ? '' : 's'} (${model.percentage}%)`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-3">
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] mb-1">
                              {model.count > 0 ? `${model.count} Quoted` : 'Active 3D Model'}
                            </span>
                            <p className="text-xs font-bold text-[#232B32]">
                              {model.totalValue > 0
                                ? `₱${Number(model.totalValue).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                                : '0 Value'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Quick Insights & Catalog Highlights ── */}
        <div
          style={{
            backgroundColor: '#FDF8F0', borderRadius: '16px',
            border: '1px solid #EFE7C6', padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32' }}>
              Quick Insights &amp; Catalog Highlights
            </h3>
            <span className="text-[11px] font-semibold text-[#C5A059] uppercase tracking-wider">
              {activeFilterCount > 0 ? 'Filtered Analysis' : 'Comprehensive Catalog & Pipeline'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[#232B32] mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                Popular Stone Designs &amp; Catalog Coverage
              </h4>
              <ul className="space-y-2.5 pl-6">
                <li className="text-xs text-[#6B7280] flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 mr-2 shrink-0" />
                  <span>{topDesignText}</span>
                </li>
                {runnerUpDesignText && (
                  <li className="text-xs text-[#6B7280] flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 mr-2 shrink-0" />
                    <span>{runnerUpDesignText}</span>
                  </li>
                )}
                {top5Text && (
                  <li className="text-xs text-[#6B7280] flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 mr-2 shrink-0" />
                    <span>{top5Text}</span>
                  </li>
                )}
                <li className="text-xs text-[#6B7280] flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 mr-2 shrink-0" />
                  <span>
                    <strong className="text-[#232B32]">{catalogMaterials.length} Stone Designs</strong> in catalog. Any newly added stone design is immediately synced and tracked here.
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[#232B32] mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                Project Types &amp; 3D Model Catalog
              </h4>
              <ul className="space-y-2.5 pl-6">
                {projectInsights.length === 0 ? (
                  <li className="text-xs text-[#6B7280]">No projects match active filters</li>
                ) : (
                  projectInsights.map((text, idx) => (
                    <li key={idx} className="text-xs text-[#6B7280] flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 mr-2 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))
                )}
                <li className="text-xs text-[#6B7280] flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 mr-2 shrink-0" />
                  <span>
                    <strong className="text-[#232B32]">{catalogStructures.length} Blender 3D Models</strong> active in showroom across Countertops, Islands, Wall Cladding, and Flooring.
                  </span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer */}
      <p className="text-center text-xs mt-10 tracking-wide" style={{ color: '#9CA3AF' }}>
        Six Sigmaphil Corp. &middot; Analytics & Insights Portal
      </p>

    </div>
  );
}
