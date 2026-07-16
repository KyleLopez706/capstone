import { Canvas } from '@react-three/fiber';
import {
  useGLTF,
  OrbitControls,
  ContactShadows,
  Environment,
  SpotLight,
  Html,
} from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────
   SHOWROOM CANVAS
   Full-viewport multi-model gallery.

   Accepts `structures` (array from Supabase) and
   renders each GLB model side-by-side in one scene.

   Each model has:
     • A floating gold text label with its name
     • A hover "Click to configure" badge
     • A glowing selection ring on hover
     • A dark pedestal platform beneath it

   Clicking any model calls onStructureSelect(structure)
   which the parent (Configurator3D) uses to seed the
   configurator store and transition to configurator mode.
───────────────────────────────────────── */

/* ─── Mesh Zone Classifier ──────────────────────────
   Exact Blender mesh names matched first;
   keyword fallback handles future renames.
──────────────────────────────────────────────────── */
const EXACT_ZONE_MAP = {
  granite_slab:    'stone',
  cabinet_base:    'cabinet',
  faucets:         'metal',
  sink_bowls:      'metal',
  electric_socket: 'socket',
};

function meshZone(name = '') {
  const lower = name.trim().toLowerCase();
  for (const [key, zone] of Object.entries(EXACT_ZONE_MAP)) {
    if (key.toLowerCase() === lower) return zone;
  }
  // Keyword fallback
  if (['top','surface','stone','counter','slab','granite','marble','quartz'].some((kw) => lower.includes(kw)))   return 'stone';
  if (['sink','faucet','tap','handle','spout','basin','drain','chrome','steel','metal'].some((kw) => lower.includes(kw))) return 'metal';
  if (['cabinet','carcass','door','base','body','panel','drawer','frame','unit','box'].some((kw) => lower.includes(kw))) return 'cabinet';
  if (['socket','outlet','plug','electrical'].some((kw) => lower.includes(kw))) return 'socket';
  return 'default';
}

// Static shared materials — instantiated once, never recreated per render
const SHOWROOM_MATERIALS = {
  stone:   new THREE.MeshStandardMaterial({ color: '#B8AFA8', roughness: 0.55, metalness: 0.02 }),
  metal:   new THREE.MeshStandardMaterial({ color: '#C0C8D0', roughness: 0.15, metalness: 0.92, envMapIntensity: 1.2 }),
  cabinet: new THREE.MeshStandardMaterial({ color: '#543D2B', roughness: 0.75, metalness: 0.05 }),
  socket:  new THREE.MeshStandardMaterial({ color: '#3A3D42', roughness: 0.85, metalness: 0.02 }),
  default: new THREE.MeshStandardMaterial({ color: '#F9F9FB', roughness: 0.8,  metalness: 0.0  }),
};

/* ─────────────────────────────────────────
   SINGLE SHOWROOM MODEL
   One GLB model + label + hover effects.
   Must be inside a <Canvas> (R3F context).
───────────────────────────────────────── */
function ShowroomModel({ structure, position, onSelect }) {
  const { scene } = useGLTF(structure.model_url);
  const [hovered,  setHovered]  = useState(false);
  const [entering, setEntering] = useState(false);

  // Apply zone materials once the scene is available
  useEffect(() => {
    scene.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow    = true;
      n.receiveShadow = true;
      
      let zone = meshZone(n.name);
      if (zone === 'default' && n.parent?.name) {
        zone = meshZone(n.parent.name);
      }
      
      n.material = SHOWROOM_MATERIALS[zone];
    });
  }, [scene]);

  // Prevent double-fire on rapid clicks (AGENTS.md §A)
  const handleClick = () => {
    if (entering) return;
    setEntering(true);
    onSelect(structure);
  };

  return (
    <group position={position}>

      {/* ── Floating name label ── */}
      <Html
        center
        position={[0, 1.9, 0]}
        distanceFactor={10}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            background: hovered
              ? 'linear-gradient(135deg, rgba(35,43,50,0.97) 0%, rgba(50,38,20,0.97) 100%)'
              : 'linear-gradient(135deg, rgba(26,30,34,0.92) 0%, rgba(35,43,50,0.92) 100%)',
            border: `1px solid ${hovered ? 'rgba(197,160,89,0.95)' : 'rgba(197,160,89,0.45)'}`,
            borderRadius: '8px',
            padding: '8px 20px',
            color: hovered ? '#F5D28A' : '#C5A059',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(10px)',
            boxShadow: hovered
              ? '0 4px 28px rgba(197,160,89,0.45), 0 0 0 1px rgba(197,160,89,0.15)'
              : '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'all 0.25s ease',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          {structure.name}
        </div>
      </Html>

      {/* ── "Click to configure" hint — shown on hover ── */}
      {hovered && (
        <Html
          center
          position={[0, 1.35, 0]}
          distanceFactor={10}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: 'rgba(197,160,89,0.12)',
              border: '1px solid rgba(197,160,89,0.38)',
              borderRadius: '6px',
              padding: '4px 12px',
              color: 'rgba(245,210,138,0.9)',
              fontSize: '9px',
              fontWeight: '600',
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
            }}
          >
            Click to configure →
          </div>
        </Html>
      )}

      {/* ── 3D model primitive ── */}
      <primitive
        object={scene}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true);  }}
        onPointerOut={()  => { document.body.style.cursor = 'auto';    setHovered(false); }}
        scale={hovered ? 1.025 : 1}
      />

      {/* ── Pedestal platform ── */}
      <mesh position={[0, -0.58, 0]} receiveShadow>
        <cylinderGeometry args={[2.0, 2.2, 0.06, 64]} />
        <meshStandardMaterial color="#232B32" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* ── Gold glow ring on hover ── */}
      {hovered && (
        <mesh position={[0, -0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.7, 2.15, 64]} />
          <meshBasicMaterial
            color="#C5A059"
            transparent
            opacity={0.38}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/* ─── Wireframe placeholders shown while GLBs load ─── */
function CanvasLoader({ count }) {
  const positions = Array.from({ length: count }, (_, i) => {
    const x = (i - (count - 1) / 2) * 5;
    return [x, 0, 0];
  });
  return (
    <>
      {positions.map(([x]) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[1.2, 0.1, 0.6]} />
          <meshStandardMaterial color="#555" wireframe />
        </mesh>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────
   SHOWROOM CANVAS  (exported component)
───────────────────────────────────────── */
export default function ShowroomCanvas({ structures, onStructureSelect }) {
  // Horizontal spacing between models (units)
  const SPACING = 5;

  // Compute world-space position for each model
  const positions = structures.map((_, i) => [
    (i - (structures.length - 1) / 2) * SPACING,
    0,
    0,
  ]);

  // Pull camera back as more models are added so all fit in frame
  const cameraZ = Math.max(6, structures.length * 3.5);

  return (
    <div className="relative w-full h-full">

      {/* ── Pulsing bottom hint overlay ── */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-3"
        aria-hidden="true"
      >
        {/* Pulsing ring */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-14 h-14 rounded-full animate-ping opacity-40"
            style={{ border: '2px solid #C5A059' }}
          />
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(197,160,89,0.15)',
              border: '1px solid rgba(197,160,89,0.5)',
            }}
          >
            <svg
              className="w-4 h-4"
              style={{ color: '#C5A059' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C5A059' }}>
          Click a model to configure · Drag to orbit
        </p>
      </div>

      {/* ── R3F Canvas ── */}
      <Canvas
        shadows
        gl={{ shadowMapType: THREE.PCFShadowMap }}
        camera={{ position: [0, 1.8, cameraZ], fov: 45 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at 50% 30%, #3a4048 0%, #1c2026 100%)',
        }}
      >
        <Suspense fallback={<CanvasLoader count={structures.length || 2} />}>

          {/* ── Studio Lighting ── */}
          <ambientLight intensity={0.2} />

          {/* Key light — warm white from above centre */}
          <SpotLight
            position={[0, 9, 4]}
            intensity={3.0}
            angle={0.5}
            penumbra={0.8}
            castShadow
            color="#fff5e0"
          />
          {/* Fill light — cool blue from left */}
          <SpotLight
            position={[-7, 7, -1]}
            intensity={1.0}
            angle={0.5}
            penumbra={1}
            castShadow={false}
            color="#c8dfff"
          />
          {/* Rim light — warm right side */}
          <SpotLight
            position={[7, 5, -2]}
            intensity={0.7}
            angle={0.5}
            penumbra={1}
            castShadow={false}
            color="#fff0d8"
          />

          {/* ── Render each structure as an individual model card ── */}
          {structures.map((structure, i) => (
            <ShowroomModel
              key={structure.id}
              structure={structure}
              position={positions[i]}
              onSelect={onStructureSelect}
            />
          ))}

          {/* ── Ground contact shadow spanning the whole scene ── */}
          <ContactShadows
            position={[0, -0.6, 0]}
            opacity={0.5}
            scale={22}
            blur={3}
            far={1.5}
          />

          {/* ── IBL for physically-accurate reflections ── */}
          <Environment preset="studio" />

          {/* ── Camera controls — orbit + auto-rotate ── */}
          <OrbitControls
            enablePan={false}
            minDistance={3}
            maxDistance={14}
            minPolarAngle={Math.PI / 10}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate
            autoRotateSpeed={0.5}
            target={[0, 0.2, 0]}
          />

        </Suspense>
      </Canvas>
    </div>
  );
}

// Pre-cache GLBs as soon as their URLs are known to prevent re-fetching (AGENTS.md §C)
ShowroomCanvas.preload = (url) => {
  if (url) useGLTF.preload(url);
};
