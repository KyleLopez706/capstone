import { useState } from 'react';
import useConfiguratorStore from '../../store/configuratorStore';

/* ─────────────────────────────────────────
   DIMENSION & PRICING PANEL  (Right Column)

   Input strategy (AGENTS.md §B):
   ──────────────────────────────
   We keep LOCAL string state for each input so the
   user can type freely without being interrupted by
   React re-renders from the global Zustand store.

   On BLUR we validate the raw string, clamp it to a
   reasonable range, and commit the final number to
   the store.  The live price calculation reads from
   the local parsed values so it updates in real-time
   as the user types — without touching the store on
   every keystroke.
───────────────────────────────────────── */
export default function DimensionPanel() {
  const selectedMaterial = useConfiguratorStore((s) => s.selectedMaterial);
  const dimensions       = useConfiguratorStore((s) => s.dimensions);
  const setDimension     = useConfiguratorStore((s) => s.setDimension);

  /* Local string state — allows free typing (no numeric coercion per keystroke) */
  const [lenStr, setLenStr] = useState(() => String(dimensions.length ?? 1.2));
  const [widStr, setWidStr] = useState(() => String(dimensions.width  ?? 0.6));

  /* ── Helpers ── */
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  /* Parse + validate + commit on blur */
  const commitLength = (raw) => {
    const num     = parseFloat(raw);
    const clamped = isNaN(num) || num <= 0 ? 1.2 : clamp(num, 0.1, 999);
    setDimension('length', clamped);
    setLenStr(String(clamped));
  };
  const commitWidth = (raw) => {
    const num     = parseFloat(raw);
    const clamped = isNaN(num) || num <= 0 ? 0.6 : clamp(num, 0.1, 999);
    setDimension('width', clamped);
    setWidStr(String(clamped));
  };

  /* Live price calculation derived from local strings (real-time feedback) */
  const localLen    = parseFloat(lenStr) || 0;
  const localWid    = parseFloat(widStr) || 0;
  const area        = localLen * localWid;
  const pricePerSqm = selectedMaterial?.price_per_sqm ?? 0;
  const total       = area * pricePerSqm;

  const inputStyle = {
    backgroundColor: '#232B32',
    border: '1px solid rgba(226,232,240,0.2)',
    color: '#F9F9FB',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  };

  return (
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

        {/* ── Length Input ── */}
        <div>
          <label
            htmlFor="dim-length"
            className="block text-xs font-semibold tracking-wider uppercase mb-2"
            style={{ color: '#9CA3AF' }}
          >
            Length (meters)
          </label>
          <input
            id="dim-length"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            /* Controlled by LOCAL state — not the Zustand store directly.
               This prevents the "0-prefix" glitch where parseFloat('') = 0
               would prepend a 0 to whatever the user typed next. */
            value={lenStr}
            onChange={(e) => setLenStr(e.target.value)}
            onBlur={(e)   => commitLength(e.target.value)}
            /* Commit on Enter key as well for convenience */
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            style={inputStyle}
            onFocus={(e)  => {
              e.currentTarget.style.borderColor = '#C5A059';
              /* Select all text on focus so the user can immediately type
                 a new value without having to manually clear the field */
              e.currentTarget.select();
            }}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(226,232,240,0.2)')}
          />
        </div>

        {/* ── Width Input ── */}
        <div>
          <label
            htmlFor="dim-width"
            className="block text-xs font-semibold tracking-wider uppercase mb-2"
            style={{ color: '#9CA3AF' }}
          >
            Width (meters)
          </label>
          <input
            id="dim-width"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            value={widStr}
            onChange={(e) => setWidStr(e.target.value)}
            onBlur={(e)   => commitWidth(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            style={inputStyle}
            onFocus={(e)  => {
              e.currentTarget.style.borderColor = '#C5A059';
              e.currentTarget.select();
            }}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(226,232,240,0.2)')}
          />
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

        {/* ── Design Quality Score — PLACEHOLDER ──
             AI analysis logic is intentionally not implemented yet.
             This div is reserved for future integration.           */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: '#232B32',
            border: '1px dashed rgba(197,160,89,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgba(197,160,89,0.15)' }}
            >
              <svg
                className="w-3 h-3"
                style={{ color: '#C5A059' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
            </div>
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: '#C5A059' }}
            >
              Design Quality Score
            </p>
          </div>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            AI analysis coming soon — will evaluate material harmony, proportions, and design cohesion.
          </p>
        </div>

        {/* Request Quote CTA */}
        <button
          id="request-quote-btn"
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-widest uppercase opacity-40 cursor-not-allowed"
          style={{ backgroundColor: '#C5A059', color: '#fff' }}
        >
          Request a Quote
        </button>

      </div>
    </div>
  );
}
