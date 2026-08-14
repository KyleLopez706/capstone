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

      {/* ── 3-Column Layout (Responsive) ── */}
      {/* On mobile: Canvas top, panels scroll below. On desktop: side-by-side. */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* CENTRE on Desktop / TOP on Mobile — 3D Preview Canvas */}
        <div
          className="order-1 lg:order-2 w-full lg:flex-1 h-[45vh] lg:h-auto shrink-0 flex items-center justify-center p-2 lg:p-4"
          style={{ backgroundColor: '#1a1e22' }}
        >
          <div className="w-full h-full">
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

        {/* PANELS on Mobile (Scrollable Bottom) / SIDEBARS on Desktop */}
        <div className="order-2 lg:contents flex-1 overflow-y-auto lg:overflow-hidden flex flex-col bg-[#1c2026]">
          
          {/* LEFT on Desktop / 1st Panel on Mobile */}
          <div className="order-1 lg:order-1 w-full lg:w-52 shrink-0 lg:h-full" style={{ minHeight: '450px' }}>
            <MaterialPanel />
          </div>

          {/* RIGHT on Desktop / 2nd Panel on Mobile */}
          <div className="order-2 lg:order-3 w-full lg:w-60 shrink-0 lg:h-full border-t lg:border-t-0" style={{ minHeight: '400px', borderColor: 'rgba(226,232,240,0.1)' }}>
            <DimensionPanel />
          </div>

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
