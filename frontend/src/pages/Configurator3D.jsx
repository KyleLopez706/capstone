import { useEffect, useState } from 'react';
import { useTexture }         from '@react-three/drei';
import Navbar                 from '../components/Navbar';
import ShowroomCanvas         from '../components/configurator/ShowroomCanvas';
import ConfiguratorLayout     from '../components/configurator/ConfiguratorLayout';
import useConfiguratorStore   from '../store/configuratorStore';
import { supabase }           from '../supabaseClient';

/* ─────────────────────────────────────────
   CONFIGURATOR 3D PAGE
   Top-level orchestrator for the 3D experience.

   On mount:  fetches ALL structures AND materials from Supabase
              in parallel, then immediately preloads every PBR
              texture so they are cached before the user clicks.

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
 * MODEL_VERSION — a stable version string appended to every model URL.
 *
 * WHY NOT Date.now()?
 * Using Date.now() generates a unique query string on every page load
 * (e.g. ?v=1722222222222).  The Supabase Storage CDN treats each unique
 * URL as a distinct asset, so NO visitor ever gets a cache hit — every
 * visit re-downloads the full .glb file from origin.  That is the primary
 * reason cached egress was at 159%.
 *
 * HOW TO BUST THE CACHE INTENTIONALLY:
 * When you replace a .glb file in Supabase Storage, increment this number
 * (e.g. '1' → '2').  All users will then fetch the new file once, after
 * which it is cached again.  Never use Date.now() here.
 */
const MODEL_VERSION = '1';
function addCacheVersion(url) {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${MODEL_VERSION}`;
}

/**
 * preloadMaterialTextures — fires useTexture.preload() for every PBR
 * texture URL in the materials list so the Three.js loader downloads
 * them into its cache NOW, while the user is still in the showroom.
 *
 * When the user eventually clicks a model and MaterialPanel mounts,
 * useTexture() finds the files already in-cache and returns instantly
 * instead of triggering fresh 3–8 s network downloads.
 *
 * useTexture.preload is a static method on the drei hook — it is safe
 * to call outside a React/Canvas context; it simply queues the URLs
 * with THREE.DefaultLoadingManager.  GPU upload still happens on first
 * render, but that is ~100 ms vs. the previous 8–11 s download wait.
 */
function preloadMaterialTextures(materials = []) {
  materials.forEach((mat) => {
    if (mat.color_url)     useTexture.preload(mat.color_url);
    if (mat.normal_url)    useTexture.preload(mat.normal_url);
    if (mat.roughness_url) useTexture.preload(mat.roughness_url);
  });
}

export default function Configurator3D() {
  const appMode      = useConfiguratorStore((s) => s.appMode);
  const setStructure = useConfiguratorStore((s) => s.setStructure);
  const setAppMode   = useConfiguratorStore((s) => s.setAppMode);

  // All available structures fetched from Supabase
  const [structures, setStructures] = useState([]);
  const [loading,    setLoading]    = useState(true);

  /* ── Fetch structures AND materials in parallel on first render ──────────
     Using Promise.all means both API calls go out simultaneously instead
     of sequentially.  The materials list is only used here for texture
     preloading; the actual panel UI still fetches it independently so it
     remains self-contained and resilient to this call failing.
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const boot = async () => {
      /* Fire both fetches at the same time — parallel, not sequential */
      const [structuresResult, materialsResult] = await Promise.all([
        supabase
          .from('structures')
          .select('id, name, base_length, base_width, model_url')
          .order('name'),
        supabase
          .from('materials')
          .select('id, color_url, normal_url, roughness_url')
          .limit(32), // upper-bound guard; matches MaterialPanel's limit
      ]);

      /* ── Handle structures ── */
      if (structuresResult.error) {
        console.warn('[Configurator3D] Structures fetch failed:', structuresResult.error.message);
        const fallbacks = FALLBACK_STRUCTURES.map((s) => ({
          ...s, model_url: addCacheVersion(s.model_url),
        }));
        setStructures(fallbacks);
        if (fallbacks[0]?.model_url) ShowroomCanvas.preload(fallbacks[0].model_url);
      } else if (structuresResult.data?.length) {
        const versioned = structuresResult.data.map((s) => ({
          ...s, model_url: addCacheVersion(s.model_url),
        }));
        setStructures(versioned);
        // Only preload the first GLB eagerly to avoid N × GLB egress on cold load.
        // The carousel renders all models inside <Suspense> so remaining GLBs
        // stream in on-demand as the user scrolls to them.
        if (versioned[0]?.model_url) ShowroomCanvas.preload(versioned[0].model_url);
      } else {
        console.warn('[Configurator3D] No structures found — using fallback.');
        const fallbacks = FALLBACK_STRUCTURES.map((s) => ({
          ...s, model_url: addCacheVersion(s.model_url),
        }));
        setStructures(fallbacks);
        if (fallbacks[0]?.model_url) ShowroomCanvas.preload(fallbacks[0].model_url);
      }

      /* ── Eagerly preload ALL PBR textures while the user browses ────────
         This is the primary fix for the 11-second first-click delay.
         The downloads start NOW (showroom load time), so by the time the
         user clicks a model, the texture files are already in browser
         cache / THREE.js cache.  MaterialPanel's own preload call becomes
         a fast no-op against the already-populated cache.
      ─────────────────────────────────────────────────────────────────── */
      if (!materialsResult.error && materialsResult.data?.length) {
        preloadMaterialTextures(materialsResult.data);
      }
      // A materials fetch failure is non-fatal here — we log it silently and
      // let MaterialPanel handle its own retry UI.  The textures just won't
      // be pre-cached, falling back to the original on-demand load.
      else if (materialsResult.error) {
        console.warn('[Configurator3D] Material preload fetch failed (non-fatal):', materialsResult.error.message);
      }

      setLoading(false);
    };

    boot();
  }, []);

  /**
   * handleStructureSelect — called when the user clicks a model in the showroom.
   * Seeds the Zustand store with the chosen structure (dimensions + model URL),
   * then immediately transitions to configurator mode.
   *
   * WHY NO setTimeout?
   * The previous 350 ms delay added artificial latency on top of an already
   * slow first-load.  Zustand setState is synchronous, so the store is fully
   * updated before the mode switch.  The transition is now instant.
   */
  const handleStructureSelect = (structure) => {
    setStructure(structure);
    setAppMode('configurator'); // immediate — no artificial 350 ms wait
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
