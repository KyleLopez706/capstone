import { Canvas, useThree } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  useTexture,
  Environment,
  MeshReflectorMaterial,
  ContactShadows,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, Component } from "react";
import * as THREE from "three";
import useConfiguratorStore from "../../store/configuratorStore";

function CameraOffset() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (size.width >= 1024) {
      camera.setViewOffset(size.width, size.height, 210, 0, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    return () => camera.clearViewOffset();
  }, [camera, size]);
  return null;
}

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
  if (['top','surface','stone','counter','slab','granite','marble','quartz','wall','floor'].some((kw) => lower.includes(kw)))
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
    color:     '#7F5112', // wood/brown base color
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
  // Load the primary color map. We ignore normal/roughness maps
  // to give the granite a smooth, realistic polished finish.
  const textures = useTexture({
    map: material.color_url || FALLBACK_1PX,
  });

  const appliedIdRef = useRef(null);

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
      colorMap.anisotropy = 16;
      colorMap.wrapS = THREE.RepeatWrapping;
      colorMap.wrapT = THREE.RepeatWrapping;
      colorMap.repeat.set(repeatX, repeatZ);
      colorMap.needsUpdate = true;
    }

    const mat = new THREE.MeshPhysicalMaterial({
      map: material.color_url ? colorMap : null,
      // Base roughness before the clearcoat
      roughness: 0.2,
      metalness: 0.0,
      envMapIntensity: 1.0,
      // The magic sauce for polished stone: a thick, perfectly smooth glassy layer on top
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.5, // Index of refraction similar to glass/resin
    });

    targetNodes.forEach((node) => {
      node.material = mat;
      node.castShadow = true;
      node.receiveShadow = true;
    });

    appliedIdRef.current = material.id;
    onApplied?.();

    return () => {
      mat.dispose();
      colorMap?.dispose();
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
function CountertopWithMaterial({ modelUrl, onTextureApplied, theme, lowEndMode }) {
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

  // Dynamically compute the model's lowest point so the floor never clips
  const minY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    return isFinite(box.min.y) ? box.min.y : 0;
  }, [clonedScene]);

  return (
    <>
      <primitive object={clonedScene} scale={[scaleX, 1, scaleZ]} />
      
      <group position={[0, minY, 0]}>
        {!lowEndMode && (
          <>
            <ShowroomFloor theme={theme} />
            <ContactShadows
              position={[0, 0.01, 0]}
              opacity={theme === 'dark' ? 0.8 : 0.4}
              scale={10}
              blur={1.5}
              far={1.0}
              resolution={256}
            />
          </>
        )}
      </group>

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
function ShowroomFloor({ theme }) {
  const concreteTexture = useTexture('/assets/concrete.jpg');
  
  // Make texture seamless
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    concreteTexture.repeat.set(100, 100);
    concreteTexture.needsUpdate = true;
  }, [concreteTexture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[500, 500]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={256}
        mixBlur={0.7}
        mixStrength={1.5}
        map={concreteTexture}
        roughnessMap={concreteTexture}
        roughness={0.9}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color={theme === 'dark' ? '#0c0d10' : '#FAF9F6'}
        metalness={0.2}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────
   DYNAMIC LIGHTING RIGS
   Tuned for granite/stone surfaces:
   - Low ambient to preserve color saturation
   - Strong directional key light for texture relief
   - Subtle fill light for shadow softening
   - Environment map at reduced intensity for
     reflections without washing out the color map
───────────────────────────────────────── */
function RigSetup({ mode, lowEndMode }) {
  if (lowEndMode) {
    return (
      <>
        <ambientLight intensity={0.3} color="#ffffff" />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.0001} color="#ffffff" />
        <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#b0c4de" />
        <Environment preset="city" environmentIntensity={0.3} />
      </>
    );
  }

  if (mode === 'daylight') {
    return (
      <>
        {/* Low ambient keeps shadows deep so texture bumps are visible */}
        <ambientLight intensity={0.25} color="#ffffff" />
        {/* Key light: strong overhead sun hitting at an angle to rake across the surface */}
        <directionalLight position={[8, 12, 4]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} color="#fff8f0" />
        {/* Accent spot: focused pool of light on the countertop center */}
        <spotLight position={[-2, 7, 3]} angle={0.6} penumbra={0.6} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} color="#ffffff" />
        {/* Fill: subtle cool bounce to soften harsh shadows without flattening */}
        <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#c4d4e8" />
        {/* Environment kept low so reflections hint at surroundings without dominating the color map */}
        <Environment preset="city" environmentIntensity={0.35} />
      </>
    );
  }

  if (mode === 'warm') {
    return (
      <>
        <ambientLight intensity={0.15} color="#ffeedd" />
        {/* Warm key light simulating evening interior lighting */}
        <directionalLight position={[6, 6, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} color="#ffb066" />
        {/* Warm accent spot */}
        <spotLight position={[1, 5, 2]} angle={0.6} penumbra={0.7} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} color="#ffccaa" />
        {/* Cool counter-fill for depth without killing the warm mood */}
        <directionalLight position={[-6, 2, -4]} intensity={0.3} color="#445566" />
        <Environment preset="sunset" environmentIntensity={0.25} />
      </>
    );
  }

  // Default: Studio — the most neutral, color-accurate preset
  return (
    <>
      {/* Very low ambient so the directional lights do the heavy lifting */}
      <ambientLight intensity={0.2} color="#ffffff" />
      {/* Key light from upper-front-right: rakes across the surface to reveal normal map detail */}
      <directionalLight position={[5, 8, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} color="#ffffff" />
      {/* Accent spot: tight pool directly above the model */}
      <spotLight position={[0, 6, 1]} angle={0.5} penumbra={0.6} intensity={2.0} castShadow shadow-mapSize={[1024, 1024]} color="#ffffff" />
      {/* Fill from the back-left to gently lift shadows */}
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#c4d4e8" />
      {/* Rim light from behind to separate model from background */}
      <directionalLight position={[0, 3, -6]} intensity={0.5} color="#ffffff" />
      {/* Studio environment at low intensity: gives subtle reflections on polished stone
         without overpowering the actual texture colors */}
      <Environment preset="studio" environmentIntensity={0.3} />
    </>
  );
}

export default function ConfiguratorCanvas({ modelUrl }) {
  // Shimmer overlay: shown while a texture is loading, hidden once applied.
  // Uses a ref so toggling it never triggers a Canvas re-render.
  const overlayRef = useRef(null);
  const canvasTheme = useConfiguratorStore((s) => s.canvasTheme);
  const lowEndMode = useConfiguratorStore((s) => s.lowEndMode);
  const lightingRig = useConfiguratorStore((s) => s.lightingRig);

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
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ shadowMapType: THREE.PCFShadowMap, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.2, 3], fov: 45 }}
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
          background: "transparent",
          borderRadius: "12px",
        }}
      >
        <CameraOffset />
        {/* Soft studio background */}
        <color 
          attach="background" 
          args={[
            canvasTheme === 'dark' 
              ? (lowEndMode ? '#1A1F24' : '#0c0d10') 
              : (lowEndMode ? '#E2E8F0' : '#FAF9F6')
          ]} 
        />
        
        {/* Fog perfectly matched to the background color to create an infinite floor illusion */}
        <fog 
          attach="fog" 
          args={[
            canvasTheme === 'dark' 
              ? (lowEndMode ? '#1A1F24' : '#0c0d10') 
              : (lowEndMode ? '#E2E8F0' : '#FAF9F6'), 
            5, 25
          ]} 
        />

        <Suspense fallback={<CanvasLoader />}>
          <RigSetup mode={lightingRig} lowEndMode={lowEndMode} />

          <group position={[0, -0.45, 0]}>
            <CountertopWithMaterial
              modelUrl={modelUrl}
              onTextureApplied={handleTextureApplied}
              theme={canvasTheme}
              lowEndMode={lowEndMode}
            />
          </group>
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.5}
          maxDistance={5}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2}
          target={[0, -0.2, 0]}
        />
      </Canvas>

      {/* ── Rotation Hint ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: canvasTheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
          padding: '10px 20px',
          borderRadius: '30px',
          backdropFilter: 'blur(8px)',
          border: canvasTheme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', gap: '4px', color: '#C5A059' }}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '700', 
          color: canvasTheme === 'dark' ? '#F9F9FB' : '#232B32',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
          Drag to Rotate
        </span>
      </div>

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
