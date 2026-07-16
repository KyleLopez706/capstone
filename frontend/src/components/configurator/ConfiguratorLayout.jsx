import MaterialPanel      from './MaterialPanel';
import ConfiguratorCanvas from './ConfiguratorCanvas';
import DimensionPanel     from './DimensionPanel';
import useConfiguratorStore from '../../store/configuratorStore';

/* ─────────────────────────────────────────
   CONFIGURATOR LAYOUT
   3-column composition:
     Left  → MaterialPanel (stone swatches)
     Centre → ConfiguratorCanvas (3D preview)
     Right  → DimensionPanel (sizing + pricing)
───────────────────────────────────────── */
export default function ConfiguratorLayout() {
  const setAppMode       = useConfiguratorStore((s) => s.setAppMode);
  const selectedStructure = useConfiguratorStore((s) => s.selectedStructure);
  const modelUrl          = selectedStructure?.model_url ?? '';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 h-12 shrink-0"
        style={{
          backgroundColor: '#232B32',
          borderBottom: '1px solid rgba(226,232,240,0.12)',
        }}
      >
        {/* Back button */}
        <button
          id="back-to-showroom-btn"
          onClick={() => setAppMode('showroom')}
          className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase cursor-pointer transition-colors duration-150"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Showroom
        </button>

        {/* Centre title */}
        <p
          className="text-xs font-light tracking-widest uppercase hidden sm:block"
          style={{ color: '#9CA3AF' }}
        >
          {selectedStructure?.name ?? 'Bathroom Countertop'} · Configurator
        </p>

        {/* Spacer to keep title centred */}
        <div className="w-24 hidden sm:block" />
      </div>

      {/* ── 3-Column Layout ── */}
      {/* On mobile, stack vertically. On desktop, side-by-side. */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* LEFT — Material Swatches */}
        <div className="lg:w-52 shrink-0 overflow-hidden" style={{ minHeight: '160px' }}>
          <MaterialPanel />
        </div>

        {/* CENTRE — 3D Preview Canvas */}
        <div
          className="flex-1 flex items-center justify-center p-4"
          style={{ backgroundColor: '#1a1e22', minHeight: '320px' }}
        >
          <div className="w-full h-full" style={{ minHeight: '260px' }}>
            {modelUrl ? (
              <ConfiguratorCanvas modelUrl={modelUrl} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs tracking-widest uppercase" style={{ color: '#6B7280' }}>
                  Loading model…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Dimensions & Pricing */}
        <div className="lg:w-60 shrink-0 overflow-hidden" style={{ minHeight: '160px' }}>
          <DimensionPanel />
        </div>

      </div>

      {/* Mobile rotate nudge */}
      <div
        className="lg:hidden text-center text-xs py-2 shrink-0"
        style={{ backgroundColor: '#232B32', color: '#C5A059' }}
      >
        Rotate your device for the best configurator experience.
      </div>
    </div>
  );
}
