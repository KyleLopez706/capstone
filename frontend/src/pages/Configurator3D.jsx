import { useEffect, useState } from 'react';
import Navbar              from '../components/Navbar';
import ShowroomCanvas      from '../components/configurator/ShowroomCanvas';
import ConfiguratorLayout  from '../components/configurator/ConfiguratorLayout';
import useConfiguratorStore from '../store/configuratorStore';
import { supabase }        from '../supabaseClient';

/* ─────────────────────────────────────────
   CONFIGURATOR 3D PAGE
   Top-level orchestrator for the 3D experience.

   On mount:  fetches ALL structures from Supabase
              and passes them to the showroom gallery.

   Renders:   <ShowroomCanvas />    (appMode === 'showroom')
              <ConfiguratorLayout /> (appMode === 'configurator')
───────────────────────────────────────── */

/* Fallback structures used if Supabase query fails */
const FALLBACK_STRUCTURES = [
  {
    id:          'fallback-bathroom',
    name:        'Bathroom Countertop',
    base_length: 1.2,
    base_width:  0.6,
    model_url:
      'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/bathroom_countertop.glb',
  },
  {
    id:          'fallback-island',
    name:        'Island Countertop',
    base_length: 2.4,
    base_width:  1.0,
    model_url:
      'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/island_countertop.glb',
  },
];

/**
 * bustCache — appends a ?v=<timestamp> query param to a URL so that
 * useGLTF (and the browser HTTP cache) treat it as a brand-new asset.
 * Applied to every model URL so a file replacement in Supabase Storage
 * is always picked up without a hard browser refresh.
 */
const MODEL_CACHE_VERSION = Date.now();
function bustCache(url) {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${MODEL_CACHE_VERSION}`;
}

export default function Configurator3D() {
  const appMode      = useConfiguratorStore((s) => s.appMode);
  const setStructure = useConfiguratorStore((s) => s.setStructure);
  const setAppMode   = useConfiguratorStore((s) => s.setAppMode);

  // All available structures fetched from Supabase
  const [structures, setStructures] = useState([]);
  const [loading,    setLoading]    = useState(true);

  /* ── Fetch ALL structures from Supabase on first render ── */
  useEffect(() => {
    const fetchStructures = async () => {
      // No name filter — retrieve every row in the structures table (AGENTS.md §A)
      const { data, error } = await supabase
        .from('structures')
        .select('id, name, base_length, base_width, model_url')
        .order('name');

      if (error) {
        // Network failure or RLS denial — degrade gracefully (AGENTS.md §D)
        console.warn('[Configurator3D] Structures fetch failed:', error.message);
        const fallbacks = FALLBACK_STRUCTURES.map((s) => ({
          ...s, model_url: bustCache(s.model_url),
        }));
        setStructures(fallbacks);
        fallbacks.forEach((s) => ShowroomCanvas.preload(s.model_url));
      } else if (data?.length) {
        // Bust cache on every model URL so replaced GLBs are always re-fetched
        const busted = data.map((s) => ({ ...s, model_url: bustCache(s.model_url) }));
        setStructures(busted);
        // Pre-cache all GLBs immediately (AGENTS.md §C)
        busted.forEach((s) => { if (s.model_url) ShowroomCanvas.preload(s.model_url); });
      } else {
        // Table exists but has no rows — use fallback
        console.warn('[Configurator3D] No structures found — using fallback. Check RLS or Supabase data.');
        const fallbacks = FALLBACK_STRUCTURES.map((s) => ({
          ...s, model_url: bustCache(s.model_url),
        }));
        setStructures(fallbacks);
        fallbacks.forEach((s) => ShowroomCanvas.preload(s.model_url));
      }

      setLoading(false);
    };

    fetchStructures();
  }, []);

  /**
   * handleStructureSelect — called when the user clicks a model in the showroom.
   * Seeds the Zustand store with the chosen structure (dimensions + model URL),
   * then transitions to configurator mode after a brief delay for visual feel.
   */
  const handleStructureSelect = (structure) => {
    setStructure(structure);
    setTimeout(() => setAppMode('configurator'), 350);
  };

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1e22' }}
    >
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-16 shrink-0" aria-hidden="true" />

      {/* ── Mode Router ── */}
      {loading ? (
        /* Loading state while Supabase returns structures */
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: '#C5A059', borderTopColor: 'transparent' }}
            role="status"
            aria-label="Loading showroom"
          />
          <p className="text-xs tracking-widest uppercase" style={{ color: '#9CA3AF' }}>
            Loading Showroom…
          </p>
        </div>

      ) : appMode === 'showroom' ? (
        /* ─────────── SHOWROOM MODE ─────────── */
        <div className="flex-1 overflow-hidden relative">

          {/* Gradient header overlay */}
          <div
            className="absolute top-0 left-0 right-0 z-10 px-6 py-5 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(26,30,34,0.9) 0%, transparent 100%)',
            }}
          >
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: '#C5A059' }}
            >
              Six Sigmaphil · 360° Virtual Showroom
            </p>
            <h1
              className="text-xl sm:text-3xl font-light mt-1"
              style={{ color: '#F9F9FB' }}
            >
              Select a Structure to Configure
            </h1>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {structures.length} structure{structures.length !== 1 ? 's' : ''} available
            </p>
          </div>

          <ShowroomCanvas
            structures={structures}
            onStructureSelect={handleStructureSelect}
          />
        </div>

      ) : (
        /* ─────────── CONFIGURATOR MODE ─────────── */
        <ConfiguratorLayout />
      )}
    </div>
  );
}
