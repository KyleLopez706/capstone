import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import useConfiguratorStore from '../../store/configuratorStore';
import { evaluateDesignQuality, getRecommendations, getGraniteRecommendations } from '../../utils/AIQualityEngine';

/* ─────────────────────────────────────────
   DIMENSION & PRICING PANEL  (Right Column)

   Input strategy (AGENTS.md §B + §A):
   ──────────────────────────────────────────
   We keep LOCAL string state for each text input so the
   user can type freely without being interrupted by
   React re-renders from the global Zustand store.

   SLIDERS commit to the store on every change so the 3D
   model resizes in real-time. A 300ms debounce prevents
   spamming the store on rapid drag per AGENTS.md §A
   rate-limiting rules.

   On text input BLUR we validate the raw string, clamp it
   to [DIM_MIN, DIM_MAX], and commit the final number to
   the store.
───────────────────────────────────────── */

const STEP     = 0.1;

export default function DimensionPanel() {
  const selectedMaterial  = useConfiguratorStore((s) => s.selectedMaterial);
  const materials         = useConfiguratorStore((s) => s.materials);
  const setMaterial       = useConfiguratorStore((s) => s.setMaterial);
  const selectedCabinetMaterial = useConfiguratorStore((s) => s.selectedCabinetMaterial);
  const cabinetMaterials  = useConfiguratorStore((s) => s.cabinetMaterials);
  const setCabinetMaterial = useConfiguratorStore((s) => s.setCabinetMaterial);
  const dimensions        = useConfiguratorStore((s) => s.dimensions);
  const setDimension      = useConfiguratorStore((s) => s.setDimension);
  const selectedStructure = useConfiguratorStore((s) => s.selectedStructure);

  const [aiScore, setAiScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [graniteRecs, setGraniteRecs] = useState([]);

  // Helper to guess the hex color based on the material name since it's not in the DB yet
  const getHexForMaterial = useCallback((name) => {
    if (!name) return '#808080';
    const n = name.toLowerCase();
    if (n.includes('black') || n.includes('galaxy')) return '#1A1A1A';
    if (n.includes('white') || n.includes('ivory') || n.includes('cream')) return '#F5F5F5';
    if (n.includes('grey') || n.includes('gray')) return '#888888';
    if (n.includes('brown') || n.includes('tan')) return '#8B5A2B';
    if (n.includes('red') || n.includes('rose')) return '#8B2323';
    if (n.includes('blue') || n.includes('pearl')) return '#4B535D';
    if (n.includes('green')) return '#2E8B57';
    if (n.includes('gold')) return '#D4AF37';
    
    // Deterministic fallback based on the name string so it always changes!
    let hash = 0;
    for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
    const c = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 16777215)).toString(16);
    return '#' + '000000'.substring(0, 6 - c.length) + c;
  }, []);

  useEffect(() => {
    async function fetchScore() {
      if (!selectedMaterial) {
        setAiScore(null);
        return;
      }
      
      const graniteHex = selectedMaterial.hex_code || getHexForMaterial(selectedMaterial.name);
      
      // Determine if this structure type actually has cabinets.
      // Wall cladding and flooring are stone-only — no cabinet pairing exists.
      // For these, we evaluate the stone against a clean neutral white backdrop.
      const structName = (selectedStructure?.name ?? '').toLowerCase();
      const hasCabinets = !structName.includes('wall') && !structName.includes('floor');
      
      const cabinetHex = hasCabinets
        ? (selectedCabinetMaterial?.hex_code || getHexForMaterial(selectedCabinetMaterial?.name) || '#F9F9FB')
        : '#F9F9FB'; // Neutral white — "How does this stone look in a clean modern room?"

      const score = await evaluateDesignQuality(graniteHex, cabinetHex);
      setAiScore(score);

      // Compute AI cabinet recommendations — score every cabinet against this granite
      // and surface the top 3 best-matching options for the customer.
      if (hasCabinets && cabinetMaterials?.length) {
        const recs = await getRecommendations(graniteHex, cabinetMaterials, getHexForMaterial, 3);
        setRecommendations(recs);
      } else {
        setRecommendations([]);
      }

      // Compute AI granite recommendations — score every granite design against
      // the current cabinet for countertops, or against the selected stone for
      // walls/floors (to find complementary stone alternatives).
      if (materials?.length) {
        const compareColor = hasCabinets ? cabinetHex : graniteHex;
        const gRecs = await getGraniteRecommendations(compareColor, materials, selectedMaterial?.id, getHexForMaterial, 3);
        setGraniteRecs(gRecs);
      } else {
        setGraniteRecs([]);
      }
    }
    fetchScore();
  }, [selectedMaterial, selectedCabinetMaterial, selectedStructure, cabinetMaterials, materials, getHexForMaterial]);

  const navigate = useNavigate();

  /* ── Dynamic Bounds Calculation ──
     Limits size modifications to a realistic range to prevent 3D distortion.
     Shrinking is limited to -20%, Growing is limited to +50%. */
  const baseLen = selectedStructure?.base_length || 1.2;
  const baseWid = selectedStructure?.base_width  || 0.6;
  const minLen  = Number((baseLen * 0.8).toFixed(2));
  const maxLen  = Number((baseLen * 1.5).toFixed(2));

  /* Tracks whether we're mid-auth-check to prevent button double-click */
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [authMsg, setAuthMsg]           = useState('');

  /* Local string state — allows free typing (no numeric coercion per keystroke) */
  const [lenStr, setLenStr] = useState(() => String(dimensions.length ?? 1.2));
  const [widStr, setWidStr] = useState(() => String(dimensions.width  ?? 0.6));

  /* Sync local strings when the store dimensions change externally
     (e.g. when a new structure is selected, which seeds base dimensions) */
  const prevDimRef = useRef(dimensions);
  useEffect(() => {
    if (
      dimensions.length !== prevDimRef.current.length ||
      dimensions.width  !== prevDimRef.current.width
    ) {
      setLenStr(String(dimensions.length));
      setWidStr(String(dimensions.width));
      prevDimRef.current = dimensions;
    }
  }, [dimensions]);

  /* ── Helpers ── */
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  /* Reset to baseline dimensions */
  const handleResetBaseline = useCallback(() => {
    const baseLen = selectedStructure?.base_length || 1.2;
    const baseWid = selectedStructure?.base_width || 0.6;
    setDimension('length', baseLen);
    setDimension('width', baseWid);
    setLenStr(String(baseLen));
    setWidStr(String(baseWid));
  }, [selectedStructure, setDimension]);

  /* ── Debounced slider commit ──
     300ms debounce per AGENTS.md §A to prevent spamming store updates
     during rapid slider drags. The 3D model still feels responsive
     because 300ms is imperceptible during continuous dragging. */
  const lenTimerRef = useRef(null);

  const handleLengthSlider = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setLenStr(String(val));
    
    // In the real world, a vanity or island's depth (width) remains standard
    // regardless of how long it gets. We keep it locked to the baseline.
    const baseWid = selectedStructure?.base_width || 0.6;
    setWidStr(String(baseWid));

    clearTimeout(lenTimerRef.current);
    lenTimerRef.current = setTimeout(() => {
      setDimension('length', val);
      setDimension('width', baseWid);
    }, 300);
  }, [setDimension, selectedStructure]);

  // Width is now auto-scaled based on Length, so we don't need a standalone handler

  /* Cleanup debounce timers on unmount */
  useEffect(() => {
    return () => {
      clearTimeout(lenTimerRef.current);
    };
  }, []);

  /* Live price calculation derived from local strings (real-time feedback).
     Math.max(..., 0) ensures a partially-typed negative string (e.g. "-") or
     a truly negative number can NEVER produce a negative price or area. */
  const localLen    = Math.max(parseFloat(lenStr) || 0, 0);
  const localWid    = Math.max(parseFloat(widStr) || 0, 0);
  const area        = localLen * localWid;
  
  // Installation rate logic (matches QuotationRequest.jsx)
  const getInstallRate = (nameStr) => {
    const name = (nameStr ?? '').toLowerCase();
    if (name.includes('wall') || name.includes('cladding')) return 2600;
    return 1300;
  };

  const pricePerSqm  = selectedMaterial?.price_per_sqm ?? 0;
  const materialCost = area * pricePerSqm;
  const installCost  = area * getInstallRate(selectedStructure?.name);
  const total        = materialCost + installCost;

  /* ── Proportional shape indicator ──
     Renders a small rectangle that reflects the current length:width ratio
     so the user gets instant visual feedback on proportions. */
  const maxIndicatorW = 180; // px — max width of the indicator container
  const maxIndicatorH = 80;  // px — max height
  const ratio = localLen > 0 && localWid > 0 ? localLen / localWid : 2;
  let indicatorW, indicatorH;
  if (ratio >= 1) {
    indicatorW = maxIndicatorW;
    indicatorH = Math.max(16, maxIndicatorW / ratio);
    if (indicatorH > maxIndicatorH) {
      indicatorH = maxIndicatorH;
      indicatorW = maxIndicatorH * ratio;
    }
  } else {
    indicatorH = maxIndicatorH;
    indicatorW = Math.max(16, maxIndicatorH * ratio);
    if (indicatorW > maxIndicatorW) {
      indicatorW = maxIndicatorW;
      indicatorH = maxIndicatorW / ratio;
    }
  }



  /* Slider track styling — Champagne Gold accent on the filled portion.
     Uses a CSS linear-gradient trick on the track background. */
  const sliderStyle = {
    width: '100%',
    height: '4px',
    appearance: 'none',
    WebkitAppearance: 'none',
    outline: 'none',
    borderRadius: '2px',
    background: 'rgba(226,232,240,0.15)',
    cursor: 'pointer',
    marginTop: '6px',
  };

  return (
    <>
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#1c2026', borderLeft: '1px solid rgba(226,232,240,0.1)' }}
    >
      {/* ── Panel Header ── */}
      <div
        className="px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(226,232,240,0.1)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C5A059' }}>
          Dimensions & Pricing
        </p>
        <h2 className="text-sm font-light mt-1" style={{ color: '#F9F9FB' }}>
          Customize Size
        </h2>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">

        {/* Selected Material Info */}
        <div
          className="rounded-xl p-3"
          style={{
            backgroundColor: 'rgba(197,160,89,0.08)',
            border: '1px solid rgba(197,160,89,0.2)',
          }}
        >
          <p className="text-xs tracking-wider uppercase" style={{ color: '#C5A059' }}>
            Selected Stone
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#F9F9FB' }}>
            {selectedMaterial?.name ?? '—'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            ₱{selectedMaterial?.price_per_sqm?.toLocaleString() ?? '0'} per sqm
          </p>
        </div>

        {/* ── Proportional Shape Indicator ──
            Visual feedback showing the countertop's length:width ratio
            so the user can see proportions at a glance. */}
        <div
          className="rounded-xl p-3 flex flex-col items-center gap-2"
          style={{
            backgroundColor: '#232B32',
            border: '1px solid rgba(226,232,240,0.1)',
          }}
        >
          <p className="text-xs tracking-wider uppercase w-full" style={{ color: '#9CA3AF' }}>
            Proportions Preview
          </p>
          <div
            style={{
              width:  `${indicatorW}px`,
              height: `${indicatorH}px`,
              border: '1.5px solid #C5A059',
              borderRadius: '4px',
              backgroundColor: 'rgba(197,160,89,0.08)',
              transition: 'width 0.25s ease, height 0.25s ease',
              position: 'relative',
            }}
          >
            {/* Dimension labels on the shape */}
            <span
              style={{
                position: 'absolute',
                bottom: '-16px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#C5A059',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              {localLen.toFixed(1)}m
            </span>
            <span
              style={{
                position: 'absolute',
                right: '-28px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                color: '#C5A059',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              {localWid.toFixed(1)}m
            </span>
          </div>
          {/* Spacer for the bottom label */}
          <div style={{ height: '6px' }} />
        </div>

        {/* ── Reset to Baseline Button ── */}
        <button
          onClick={handleResetBaseline}
          className="w-full py-2 rounded-lg text-xs font-semibold tracking-widest uppercase"
          style={{
            backgroundColor: 'rgba(197,160,89,0.1)',
            color: '#C5A059',
            border: '1px solid rgba(197,160,89,0.2)',
            transition: 'background-color 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(197,160,89,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(197,160,89,0.1)')}
        >
          Reset to Baseline
        </button>

        {/* ── Length Slider ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="dim-length-slider"
              className="block text-xs font-semibold tracking-wider uppercase"
              style={{ color: '#9CA3AF' }}
            >
              Length (meters)
            </label>
            <span className="text-sm font-semibold" style={{ color: '#F9F9FB' }}>
              {localLen.toFixed(2)}m
            </span>
          </div>
          {/* Slider — drags commit to the store with 300ms debounce */}
          <input
            id="dim-length-slider"
            type="range"
            min={minLen}
            max={maxLen}
            step={STEP}
            value={localLen || minLen}
            onChange={handleLengthSlider}
            style={sliderStyle}
            aria-label="Length slider"
          />
          <div className="flex justify-between text-xs mt-0.5" style={{ color: '#6B7280' }}>
            <span>{minLen.toFixed(1)}m</span>
            <span>{maxLen.toFixed(1)}m</span>
          </div>
        </div>

        {/* ── Width (Fixed Standard) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className="block text-xs font-semibold tracking-wider uppercase"
              style={{ color: '#9CA3AF' }}
            >
              Width (Standard)
            </span>
            <span className="text-sm font-semibold" style={{ color: '#F9F9FB' }}>
              {localWid.toFixed(2)}m
            </span>
          </div>
        </div>

        {/* Surface Area (live — reads from local parse, not the store) */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: '#9CA3AF' }}
        >
          <span>Surface Area</span>
          <span className="font-semibold" style={{ color: '#F9F9FB' }}>
            {area.toFixed(2)} sqm
          </span>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: 'rgba(226,232,240,0.1)' }} />

        {/* Total Estimate (live — reads from local parse) */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#232B32', border: '1px solid rgba(226,232,240,0.1)' }}
        >
          <p
            className="text-xs tracking-widest uppercase mb-2"
            style={{ color: '#9CA3AF' }}
          >
            Total Estimate
          </p>
          <p
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ₱{total.toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Estimate only · Final price may vary.
          </p>
        </div>

        {/* ── Design Quality Score ── */}
        <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: '#232B32',
              border: aiScore ? '1px solid rgba(197,160,89,0.3)' : '1px dashed rgba(197,160,89,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: '#C5A059' }}
              >
                Design Quality Score
              </p>
            </div>
            {aiScore !== null ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold leading-none" style={{ color: '#F9F9FB' }}>{aiScore}%</span>
                  <span className="text-xs font-medium mb-0.5" style={{ color: aiScore >= 70 ? '#10B981' : aiScore >= 50 ? '#F59E0B' : '#EF4444' }}>
                    {aiScore >= 70 ? 'Excellent Match' : aiScore >= 50 ? 'Fair Match' : 'Poor Match'}
                  </span>
                </div>
                
                <div 
                  className="rounded-lg p-3" 
                  style={{ backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(226,232,240,0.05)' }}
                >
                  <p className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                    <span style={{ color: '#E2E8F0', fontWeight: 600 }}>Why this score?</span>{' '}
                    {aiScore >= 70 
                      ? "Strong contrast and complementary hues — this pairing aligns with top-rated designs." 
                      : aiScore >= 50 
                      ? "Acceptable pairing, but lacks the contrast or hue harmony found in premium designs." 
                      : "These surfaces may clash in tone or hue, creating an unbalanced look."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Select a stone material to view the live AI Design Quality Score.
              </p>
            )}
          </div>

        {/* ── AI Recommendations ── */}
        {recommendations.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: '#232B32',
              border: '1px solid rgba(226,232,240,0.1)',
            }}
          >
            <p
              className="text-xs font-semibold tracking-wider uppercase mb-3"
              style={{ color: '#C5A059' }}
            >
              Recommended Cabinet Finishes
            </p>
            <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>
              Top matches for your selected stone.
            </p>
            <div className="flex flex-col gap-2">
              {recommendations.map((rec, idx) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    // Find the full cabinet material object from the store and apply it
                    const fullMat = cabinetMaterials.find(c => c.id === rec.id);
                    if (fullMat) setCabinetMaterial(fullMat);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left"
                  style={{
                    backgroundColor: selectedCabinetMaterial?.id === rec.id
                      ? 'rgba(197,160,89,0.12)'
                      : 'rgba(0,0,0,0.15)',
                    border: selectedCabinetMaterial?.id === rec.id
                      ? '1px solid rgba(197,160,89,0.35)'
                      : '1px solid rgba(226,232,240,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCabinetMaterial?.id !== rec.id)
                      e.currentTarget.style.backgroundColor = 'rgba(197,160,89,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCabinetMaterial?.id !== rec.id)
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  }}
                >
                  {/* Rank badge */}
                  <span
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: idx === 0 ? 'rgba(197,160,89,0.2)' : 'rgba(226,232,240,0.08)',
                      color: idx === 0 ? '#C5A059' : '#6B7280',
                    }}
                  >
                    {idx + 1}
                  </span>

                  {/* Color swatch */}
                  <div
                    className="shrink-0 w-6 h-6 rounded"
                    style={{
                      backgroundColor: rec.hex,
                      border: '1px solid rgba(226,232,240,0.15)',
                    }}
                  />

                  {/* Name and score */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>
                      {rec.name}
                    </p>
                  </div>

                  {/* Score pill */}
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: rec.score >= 70
                        ? 'rgba(16,185,129,0.12)'
                        : rec.score >= 50
                        ? 'rgba(245,158,11,0.12)'
                        : 'rgba(239,68,68,0.12)',
                      color: rec.score >= 70 ? '#10B981' : rec.score >= 50 ? '#F59E0B' : '#EF4444',
                    }}
                  >
                    {rec.score}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Granite Recommendations ── */}
        {graniteRecs.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: '#232B32',
              border: '1px solid rgba(226,232,240,0.1)',
            }}
          >
            <p
              className="text-xs font-semibold tracking-wider uppercase mb-3"
              style={{ color: '#C5A059' }}
            >
              Recommended Stone Designs
            </p>
            <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>
              {((selectedStructure?.name ?? '').toLowerCase().includes('wall') || (selectedStructure?.name ?? '').toLowerCase().includes('floor'))
                ? 'Stones that complement your current selection.'
                : 'Best granite matches for your cabinet finish.'
              }
            </p>
            <div className="flex flex-col gap-2">
              {graniteRecs.map((rec, idx) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    const fullMat = materials.find(m => m.id === rec.id);
                    if (fullMat) setMaterial(fullMat);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(226,232,240,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(197,160,89,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  }}
                >
                  {/* Rank badge */}
                  <span
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: idx === 0 ? 'rgba(197,160,89,0.2)' : 'rgba(226,232,240,0.08)',
                      color: idx === 0 ? '#C5A059' : '#6B7280',
                    }}
                  >
                    {idx + 1}
                  </span>

                  {/* Granite texture thumbnail */}
                  <div
                    className="shrink-0 w-8 h-8 rounded overflow-hidden"
                    style={{
                      border: '1px solid rgba(226,232,240,0.15)',
                      backgroundColor: rec.hex,
                    }}
                  >
                    {rec.color_url && (
                      <img
                        src={rec.color_url}
                        alt={rec.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Name and score */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>
                      {rec.name}
                    </p>
                  </div>

                  {/* Score pill */}
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: rec.score >= 70
                        ? 'rgba(16,185,129,0.12)'
                        : rec.score >= 50
                        ? 'rgba(245,158,11,0.12)'
                        : 'rgba(239,68,68,0.12)',
                      color: rec.score >= 70 ? '#10B981' : rec.score >= 50 ? '#F59E0B' : '#EF4444',
                    }}
                  >
                    {rec.score}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Auth message (shown when user is not signed in) ── */}
        {authMsg && (
          <p
            style={{
              fontSize: '11px',
              color: '#F59E0B',
              textAlign: 'center',
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            {authMsg}
          </p>
        )}

        {/* Request Quote CTA */}
        <button
          id="request-quote-btn"
          disabled={!selectedMaterial || checkingAuth}
          onClick={async () => {
            if (!selectedMaterial || checkingAuth) return;
            setCheckingAuth(true);
            setAuthMsg('');

            try {
              /* Check active Supabase session — user must be signed in */
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                /* Not signed in — store return intent and redirect to login */
                sessionStorage.setItem("returnTo", "/quotation-request");
                setAuthMsg('Please sign in to request a quote.');
                setTimeout(() => navigate('/login'), 1500);
                return;
              }
              /* Signed in — navigate to quotation page (store state persists in-memory) */
              navigate('/quotation-request');
            } catch (err) {
              console.error('[DimensionPanel] Auth check error:', err.message);
              setAuthMsg('Something went wrong. Please try again.');
            } finally {
              setCheckingAuth(false);
            }
          }}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-widest uppercase"
          style={{
            backgroundColor:
              !selectedMaterial || checkingAuth ? 'rgba(197,160,89,0.35)' : '#C5A059',
            color: '#fff',
            cursor: !selectedMaterial || checkingAuth ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (selectedMaterial && !checkingAuth) e.currentTarget.style.backgroundColor = '#b08d47';
          }}
          onMouseLeave={(e) => {
            if (selectedMaterial && !checkingAuth) e.currentTarget.style.backgroundColor = '#C5A059';
          }}
        >
          {checkingAuth ? 'Checking…' : 'Request a Quote'}
        </button>

      </div>
    </div>

    {/* ── Slider thumb styling ──
        Injected once via <style> tag. Styles the range input thumb
        to match the Champagne Gold accent colour system. */}
    <style>{`
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #C5A059;
        border: 2px solid #1c2026;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(197,160,89,0.4);
        transition: box-shadow 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        box-shadow: 0 0 8px rgba(197,160,89,0.6);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #C5A059;
        border: 2px solid #1c2026;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(197,160,89,0.4);
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
      }
      input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: rgba(226,232,240,0.15);
      }
    `}</style>
    </>
  );
}
