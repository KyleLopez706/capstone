import { Canvas } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  useTexture,
  Environment,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, Component } from "react";
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
   Keyed on selectedMaterial.id so each new
   material selection gets a fresh attempt.
───────────────────────────────────────── */
class TextureErrorBoundary extends Component {
  state = { hasError: false };
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
    // hasError = silent fallback; the stone mesh shows its existing gray material
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ─────────────────────────────────────────
   TEXTURE APPLICATOR
   Uses drei's useTexture (backed by React Suspense
   + a global cache).  Benefits over raw TextureLoader:

   ✓ Caches results — switching back to a material
     you already viewed is instant (no re-download).
   ✓ Suspense-based — the component simply suspends
     until ALL three maps are ready, then atomically
     swaps the material. No "gray flash" mid-load.
   ✓ Handles CORS correctly internally (no manual
     crossOrigin config needed).
   ✓ Won't crash the WebGL context because it doesn't
     race with other GPU uploads via setTimeout.
───────────────────────────────────────── */
function TextureApplicator({ material, targetNodes }) {
  // Load all three PBR maps. Null/missing URLs fall back to the 1px white PNG
  // so useTexture always receives three valid URLs.
  const textures = useTexture({
    map: material.color_url || FALLBACK_1PX,
    normalMap: material.normal_url || FALLBACK_1PX,
    roughnessMap: material.roughness_url || FALLBACK_1PX,
  });

  useEffect(() => {
    if (!targetNodes?.length) return;

    /* The react-hooks/immutability rule forbids mutating objects returned
       by hooks (even after destructuring). Clone each texture first so we
       mutate our own copy, not the cached shared instance.               */
    const colorMap = textures.map?.clone();
    const normalMap = textures.normalMap?.clone();
    const roughMap = textures.roughnessMap?.clone();

    // Color space: color map must be sRGB; data maps stay linear
    if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;

    // Disable mipmaps on all maps — cuts GPU memory by ~33 %
    [colorMap, normalMap, roughMap].forEach((t) => {
      if (!t) return;
      t.flipY = false; // GLTF UV coordinates expect top-left origin
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;

      // Apply RepeatWrapping for unwrapped models
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 1.5); // Ensure realistic granite pattern scale

      t.needsUpdate = true;
    });

    const mat = new THREE.MeshStandardMaterial({
      map: material.color_url ? colorMap : null,
      normalMap: material.normal_url ? normalMap : null,
      roughnessMap: material.roughness_url ? roughMap : null,
      roughness: 0.65,
      metalness: 0.04,
    });

    targetNodes.forEach((node) => {
      node.material = mat;
      node.castShadow = true;
      node.receiveShadow = true;
    });

    return () => {
      mat.dispose();
      colorMap?.dispose();
      normalMap?.dispose();
      roughMap?.dispose();
    };
  }, [textures, targetNodes, material]);

  return null;
}

/* ─────────────────────────────────────────
   MODEL + MATERIAL COMPOSITION
───────────────────────────────────────── */
function CountertopWithMaterial({ modelUrl }) {
  const { scene } = useGLTF(modelUrl);
  const selectedMaterial = useConfiguratorStore((s) => s.selectedMaterial);

  // Clone so we don't mutate the shared cached GLTF
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Traverse the cloned scene once:
  //   • stone (granite_slab) meshes are collected for TextureApplicator
  //   • all other meshes receive a static zone material immediately
  const stoneMeshes = useMemo(() => {
    const found = [];

    clonedScene.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow    = true;
      n.receiveShadow = true;

      let zone = meshZone(n.name);
      if (zone === 'default' && n.parent?.name) {
        zone = meshZone(n.parent.name);
      }

      if (zone === 'stone') {
        // Collected here; PBR texture applied reactively by TextureApplicator
        found.push(n);
      } else {
        // Assign the pre-built static material for this zone
        n.material = ZONE_MATERIALS[zone] ?? ZONE_MATERIALS.default;
      }
    });

    // Safety fallback: if no stone mesh matched, apply PBR to everything
    // so the model is never invisible across different GLB exports.
    if (!found.length) {
      clonedScene.traverse((n) => { if (n.isMesh) found.push(n); });
      console.warn(
        '[Configurator] No stone mesh matched — PBR applied to all meshes. '
        + 'Add the correct Blender name to EXACT_ZONE_MAP in ConfiguratorCanvas.jsx.',
      );
    }

    return found;
  }, [clonedScene]);

  return (
    <>
      <primitive object={clonedScene} />

      {/* Only mount the texture applicator when a material is selected.
          Keyed on material.id → ErrorBoundary and Suspense fully reset
          on each selection, giving each material a clean load attempt. */}
      {selectedMaterial && (
        <TextureErrorBoundary key={selectedMaterial.id}>
          <Suspense fallback={null}>
            <TextureApplicator
              material={selectedMaterial}
              targetNodes={stoneMeshes}
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
  return (
    <Canvas
      shadows
      /* Explicit shadow map type — suppresses PCFSoftShadowMap deprecation */
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

        {/* Key Light: Bright, casts shadows, angled to catch specular highlights on the granite */}
        <directionalLight
          position={[5, 5, 4]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0002}
          color="#ffffff"
        />

        {/* Fill Light: Soft cool light to fill in the shadows */}
        <directionalLight
          position={[-5, 3, -5]}
          intensity={0.6}
          color="#b0c4de"
        />

        {/* Rim Light: Separates the model from the dark background */}
        <directionalLight
          position={[0, 2, -6]}
          intensity={0.8}
          color="#ffffff"
        />

        <CountertopWithMaterial modelUrl={modelUrl} />

        {/* IBL for rich, realistic reflections on the polished stone (City provides great sharp contrast) */}
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
  );
}
