import { Canvas } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  useTexture,
  Environment,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, Component } from "react";
import * as THREE from "three";
import useConfiguratorStore from "../../store/configuratorStore";

/* ─────────────────────────────────────────
   MESH ZONE CLASSIFIER
   Uses the exact Blender mesh names from the GLB.
   Each name maps to a zone; each zone gets a
   distinct pre-built Three.js material.

   Zones:
     stone   → granite_slab   (PBR texture, user-selectable)
     cabinet → cabinet_base   (matte warm gray)
     metal   → faucets, sink_bowls (silver chrome)
     socket  → electric_socket (dark charcoal plastic)
───────────────────────────────────────── */

/**
 * EXACT_ZONE_MAP — keyed by the precise Blender object name (case-insensitive).
 * Add new mesh names here whenever the GLB export changes.
 */
const EXACT_ZONE_MAP = {
  granite_slab:    'stone',
  cabinet_base:    'cabinet',
  faucets:         'metal',
  sink_bowls:      'metal',
  electric_socket: 'socket',
};

/**
 * meshZone — resolves a mesh name to its material zone.
 * Exact match wins; keyword fallback handles future/renamed meshes.
 */
function meshZone(name = '') {
  const lower = name.trim().toLowerCase();

  // 1. Try the exact Blender name table first
  for (const [key, zone] of Object.entries(EXACT_ZONE_MAP)) {
    if (key.toLowerCase() === lower) return zone;
  }

  // 2. Keyword fallback (future-proofs against renamed meshes)
  if (['top','surface','stone','counter','slab','granite','marble','quartz'].some((kw) => lower.includes(kw)))
    return 'stone';
  if (['sink','faucet','tap','handle','spout','basin','drain','chrome','steel','metal','fixture'].some((kw) => lower.includes(kw)))
    return 'metal';
  if (['cabinet','carcass','door','base','body','panel','drawer','frame','unit','box'].some((kw) => lower.includes(kw)))
    return 'cabinet';
  if (['socket','outlet','plug','electrical'].some((kw) => lower.includes(kw)))
    return 'socket';

  return 'default';
}

/* ─────────────────────────────────────────
   SHARED STATIC MATERIALS
   Instantiated once at module load — never recreated
   per render. Three.js materials are GPU objects;
   creating them inside useMemo would leak on every
   scene re-clone without a matching dispose() call.
───────────────────────────────────────── */
const ZONE_MATERIALS = {
  // granite_slab — receives PBR texture from TextureApplicator (no static mat)
  cabinet: new THREE.MeshStandardMaterial({
    color:     '#543D2B', // rich walnut brown
    roughness: 0.75,
    metalness: 0.05,
  }),
  metal: new THREE.MeshStandardMaterial({
    color:            '#C0C8D0', // cool silver
    roughness:        0.15,     // low → mirror-like reflections
    metalness:        0.92,     // high → physically-based chrome
    envMapIntensity:  1.2,
  }),
  socket: new THREE.MeshStandardMaterial({
    color:     '#3A3D42', // dark charcoal
    roughness: 0.85,     // matte plastic
    metalness: 0.02,
  }),
  default: new THREE.MeshStandardMaterial({
    color:     '#F9F9FB',
    roughness: 0.8,
    metalness: 0.0,
  }),
};

/* ─────────────────────────────────────────
   1px WHITE PNG  — fallback for optional
   texture slots (normal map / roughness map)
   when a material doesn't have all three maps.
   Prevents useTexture from throwing on null URLs.
───────────────────────────────────────── */
const FALLBACK_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=";

/* ─────────────────────────────────────────
   ERROR BOUNDARY
   Wraps TextureApplicator. If useTexture throws
   (bad URL, network error, etc.) the boundary
   catches it silently — the mesh keeps its
   previous material and no crash occurs.

   NOTE: We do NOT key this boundary on material.id.
   Keying it caused the entire Suspense subtree to
   unmount + remount on every swatch click, which:
     • destroyed the useTexture internal cache entry
     • forced a brand-new network download every time
     • made EVERY material switch feel slow, even for
       materials the user had already viewed.
   Instead, TextureApplicator stays mounted and
   receives the next material as a prop update.
   useTexture handles the cache hit internally.
───────────────────────────────────────── */
class TextureErrorBoundary extends Component {
  state = { hasError: false, materialId: null };

  // Reset the boundary whenever the material changes so a bad URL
  // on material A doesn't permanently silence material B.
  static getDerivedStateFromProps(props, state) {
    if (props.materialId !== state.materialId) {
      return { hasError: false, materialId: props.materialId };
    }
    return null;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn(
      "[Configurator] Texture load error (caught by boundary):",
      err?.message ?? err,
    );
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ─────────────────────────────────────────
   TEXTURE APPLICATOR
   Uses drei's useTexture (backed by a global
   THREE.js cache + React Suspense).

   ✓ Cache-hits are instant — if the user revisits
     a material they already viewed, useTexture
     resolves synchronously from memory.
   ✓ First-load suspends until ALL three maps are
     ready, then atomically swaps the material.
   ✓ Stays mounted across material changes so the
     cache is never thrown away mid-session.
   ✓ onApplied() callback signals the parent that
     textures are live (used to dismiss the shimmer).
───────────────────────────────────────── */
function TextureApplicator({ material, targetNodes, onApplied, scaleFactors }) {
  // Load all three PBR maps. Null/missing URLs fall back to the 1px white PNG
  // so useTexture always receives three valid URLs and never throws on null.
  const textures = useTexture({
    map:          material.color_url     || FALLBACK_1PX,
    normalMap:    material.normal_url    || FALLBACK_1PX,
    roughnessMap: material.roughness_url || FALLBACK_1PX,
  });

  // Track the material id we last applied so we skip redundant GPU uploads
  // when the parent re-renders without the selection actually changing.
  const appliedIdRef = useRef(null);

  useEffect(() => {
    if (!targetNodes?.length) return;

    /* Clone each texture so we mutate our own copy, not the cached
       shared instance (react-hooks immutability rule).              */
    const colorMap = textures.map?.clone();
    const normalMap = textures.normalMap?.clone();
    const roughMap  = textures.roughnessMap?.clone();

    // Color space: color map must be sRGB; data maps stay linear
    if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;

    /* Scale-aware texture tiling:
       When the model stretches (e.g. 2× length), UVs still map 0→1 over
       the stretched surface. To prevent the granite pattern from stretching,
       we tile the texture proportionally via repeat. RepeatWrapping ensures
       the pattern tiles seamlessly rather than clamping at the edges.
       Mipmaps are re-enabled for clean rendering at varied repeat counts. */
    const repeatX = scaleFactors?.x ?? 1;
    const repeatZ = scaleFactors?.z ?? 1;

    [colorMap, normalMap, roughMap].forEach((t) => {
      if (!t) return;
      t.flipY = false;                          // GLTF UVs: top-left origin
      t.generateMipmaps = true;                 // needed for clean tiling at varied densities
      t.minFilter  = THREE.LinearMipmapLinearFilter;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatZ);
      t.needsUpdate = true;
    });

    const mat = new THREE.MeshStandardMaterial({
      map:          material.color_url     ? colorMap  : null,
      normalMap:    material.normal_url    ? normalMap : null,
      roughnessMap: material.roughness_url ? roughMap  : null,
      roughness: 0.65,
      metalness: 0.04,
    });

    targetNodes.forEach((node) => {
      node.material   = mat;
      node.castShadow = true;
      node.receiveShadow = true;
    });

    appliedIdRef.current = material.id;
    // Signal the parent that the texture is now live on the mesh
    onApplied?.();

    return () => {
      mat.dispose();
      colorMap?.dispose();
      normalMap?.dispose();
      roughMap?.dispose();
    };
  }, [textures, targetNodes, material, onApplied, scaleFactors]);

  return null;
}

/* ─────────────────────────────────────────
   CABINET TEXTURE APPLICATOR
   Similar to TextureApplicator but handles cabinet
   PBR maps (currently just color maps).
───────────────────────────────────────── */
function CabinetTextureApplicator({ material, targetNodes, scaleFactors }) {
  const textures = useTexture({ map: material.color_url || FALLBACK_1PX });

  useEffect(() => {
    if (!targetNodes?.length) return;

    const colorMap = textures.map?.clone();
    if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;

    const repeatX = scaleFactors?.x ?? 1;
    const repeatZ = scaleFactors?.z ?? 1;

    if (colorMap) {
      colorMap.flipY = false;
      colorMap.generateMipmaps = true;
      colorMap.minFilter = THREE.LinearMipmapLinearFilter;
      colorMap.wrapS = THREE.RepeatWrapping;
      colorMap.wrapT = THREE.RepeatWrapping;
      colorMap.repeat.set(repeatX, repeatZ);
      colorMap.needsUpdate = true;
    }

    const mat = new THREE.MeshStandardMaterial({
      map: material.color_url ? colorMap : null,
      roughness: 0.75,
      metalness: 0.05,
      color: material.color_url ? '#FFFFFF' : '#543D2B',
    });

    targetNodes.forEach((node) => {
      node.material = mat;
    });

    return () => {
      mat.dispose();
      colorMap?.dispose();
    };
  }, [textures, targetNodes, material, scaleFactors]);

  return null;
}

/* ─────────────────────────────────────────
   MODEL + MATERIAL COMPOSITION
───────────────────────────────────────── */
function CountertopWithMaterial({ modelUrl, onTextureApplied }) {
  const { scene } = useGLTF(modelUrl, true);
  const selectedMaterial  = useConfiguratorStore((s) => s.selectedMaterial);
  const selectedCabinetMaterial = useConfiguratorStore((s) => s.selectedCabinetMaterial);
  const dimensions        = useConfiguratorStore((s) => s.dimensions);
  const selectedStructure = useConfiguratorStore((s) => s.selectedStructure);

  /* ── Derive non-uniform scale factors ──
     The model's GLB geometry represents the structure's base dimensions.
     When the user inputs larger/smaller dimensions, we scale the scene
     proportionally so 1 meter in the input = 1 visual meter in the viewport.
     Height (Y) stays constant — only length (X) and width (Z) change. */
  const baseLen = selectedStructure?.base_length || dimensions.length;
  const baseWid = selectedStructure?.base_width  || dimensions.width;
  const scaleX  = dimensions.length / baseLen;
  const scaleZ  = dimensions.width  / baseWid;

  // Memoised scale factors object — stable reference when values haven't changed.
  // Prevents unnecessary re-runs of the TextureApplicator effect.
  const scaleFactors = useMemo(() => ({ x: scaleX, z: scaleZ }), [scaleX, scaleZ]);

  // Clone so we don't mutate the shared cached GLTF
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Traverse the cloned scene once:
  //   • stone meshes are collected for TextureApplicator
  //   • cabinet meshes are collected for CabinetTextureApplicator
  //   • all other meshes receive a static zone material immediately
  const { stoneMeshes, cabinetMeshes } = useMemo(() => {
    const s = [];
    const c = [];

    clonedScene.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow    = true;
      n.receiveShadow = true;

      let zone = meshZone(n.name);
      if (zone === 'default' && n.parent?.name) {
        zone = meshZone(n.parent.name);
      }

      if (zone === 'stone') {
        s.push(n);
      } else if (zone === 'cabinet') {
        c.push(n);
      } else {
        n.material = ZONE_MATERIALS[zone] ?? ZONE_MATERIALS.default;
      }
    });

    if (!s.length) {
      clonedScene.traverse((n) => { if (n.isMesh) s.push(n); });
      console.warn(
        '[Configurator] No stone mesh matched — PBR applied to all meshes. '
        + 'Add the correct Blender name to EXACT_ZONE_MAP in ConfiguratorCanvas.jsx.',
      );
    }

    return { stoneMeshes: s, cabinetMeshes: c };
  }, [clonedScene]);

  return (
    <>
      <primitive object={clonedScene} scale={[scaleX, 1, scaleZ]} />

      {/*
        IMPORTANT: TextureErrorBoundary is NOT keyed on material.id.

        Previously it was keyed on material.id, which caused React to
        fully unmount + remount the Suspense subtree on every swatch
        click. This destroyed useTexture's internal cache every time,
        forcing a fresh network download + GPU upload — making every
        switch feel slow, even for previously-seen materials.

        Now the boundary stays mounted and receives the next material
        as a prop update. useTexture serves cache-hits synchronously,
        so revisited materials swap instantly. The boundary resets
        itself via getDerivedStateFromProps when materialId changes.
      */}
      {selectedMaterial && (
        <TextureErrorBoundary materialId={selectedMaterial.id}>
          <Suspense fallback={null}>
            <TextureApplicator
              material={selectedMaterial}
              targetNodes={stoneMeshes}
              onApplied={onTextureApplied}
              scaleFactors={scaleFactors}
            />
          </Suspense>
        </TextureErrorBoundary>
      )}

      {selectedCabinetMaterial && (
        <TextureErrorBoundary materialId={selectedCabinetMaterial.id}>
          <Suspense fallback={null}>
            <CabinetTextureApplicator
              material={selectedCabinetMaterial}
              targetNodes={cabinetMeshes}
              scaleFactors={scaleFactors}
            />
          </Suspense>
        </TextureErrorBoundary>
      )}
    </>
  );
}

/* ── Wireframe box shown while GLB loads ── */
function CanvasLoader() {
  return (
    <mesh>
      <boxGeometry args={[1.2, 0.1, 0.6]} />
      <meshStandardMaterial color="#444" wireframe />
    </mesh>
  );
}

/* ─────────────────────────────────────────
   CONFIGURATOR CANVAS  (Centre Column)
───────────────────────────────────────── */
export default function ConfiguratorCanvas({ modelUrl }) {
  // Shimmer overlay: shown while a texture is loading, hidden once applied.
  // Uses a ref so toggling it never triggers a Canvas re-render.
  const overlayRef = useRef(null);

  const handleTextureApplied = () => {
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
      // After the fade-out transition completes, hide it from layout
      setTimeout(() => {
        if (overlayRef.current) overlayRef.current.style.display = 'none';
      }, 300);
    }
  };

  const selectedMaterial = useConfiguratorStore((s) => s.selectedMaterial);
  const prevMaterialIdRef = useRef(null);

  // Show the shimmer whenever the user picks a new material
  useEffect(() => {
    if (!selectedMaterial || selectedMaterial.id === prevMaterialIdRef.current) return;
    prevMaterialIdRef.current = selectedMaterial.id;
    if (overlayRef.current) {
      overlayRef.current.style.display = 'flex';
      // Micro-tick to ensure display:flex is applied before opacity animates in
      requestAnimationFrame(() => {
        if (overlayRef.current) overlayRef.current.style.opacity = '1';
      });
    }
  }, [selectedMaterial]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows
        gl={{ shadowMapType: THREE.PCFShadowMap }}
        camera={{ position: [0, 1.2, 2.5], fov: 45 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.warn(
              "[ConfiguratorCanvas] WebGL context lost — waiting for restore.",
            );
          });
        }}
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at 50% 30%, #2e3238 0%, #1a1e22 100%)",
          borderRadius: "12px",
        }}
      >
        <Suspense fallback={<CanvasLoader />}>
          {/* ── High-End PBR Lighting Setup ── */}
          <ambientLight intensity={0.4} />

          {/* Key Light */}
          <directionalLight
            position={[5, 5, 4]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0002}
            color="#ffffff"
          />

          {/* Fill Light */}
          <directionalLight
            position={[-5, 3, -5]}
            intensity={0.6}
            color="#b0c4de"
          />

          {/* Rim Light */}
          <directionalLight
            position={[0, 2, -6]}
            intensity={0.8}
            color="#ffffff"
          />

          <CountertopWithMaterial
            modelUrl={modelUrl}
            onTextureApplied={handleTextureApplied}
          />

          <Environment preset="city" />

          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={5}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>

      {/* ── Texture-loading shimmer overlay ──────────────────────────────
          Shown for the exact duration of a first-load texture fetch.
          Hidden immediately (via onApplied) once the GPU upload is done.
          Uses opacity transition so it fades rather than pops.
          display:none when idle so it doesn't intercept pointer events. */}
      <div
        ref={overlayRef}
        style={{
          display:        'none',
          opacity:        0,
          transition:     'opacity 0.3s ease',
          position:       'absolute',
          inset:          0,
          borderRadius:   '12px',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            '10px',
          pointerEvents:  'none',
          background:     'rgba(26,30,34,0.55)',
          backdropFilter: 'blur(2px)',
          zIndex:         10,
        }}
        aria-live="polite"
        aria-label="Applying texture"
      >
        {/* Gold spinner ring */}
        <div
          style={{
            width:       '36px',
            height:      '36px',
            borderRadius:'50%',
            border:      '2.5px solid rgba(197,160,89,0.25)',
            borderTopColor: '#C5A059',
            animation:   'spin 0.75s linear infinite',
          }}
        />
        <p
          style={{
            color:         '#C5A059',
            fontSize:      '10px',
            fontWeight:    '600',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily:    "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          Applying Texture…
        </p>
      </div>

      {/* Keyframe for the spinner — injected once as a style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
