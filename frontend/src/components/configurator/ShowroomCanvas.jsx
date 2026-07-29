import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  ContactShadows,
  Environment,
} from '@react-three/drei';
import { Suspense, useState, useEffect, useRef, useCallback, memo } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────
   SHOWROOM CANVAS — Carousel Edition
   Optimised for:
   • Functional suitability  – guarded URLs, index bounds, empty-state
   • Performance efficiency  – memo, frame throttle, stable positions
   • Interaction capability  – keyboard nav, touch, ARIA, grab cursor
   • Security               – HTTPS-only URL validation before GLTF load
───────────────────────────────────────── */

/* ─── Inject fadeSlideUp keyframe once into <head> ──────────────────
   Avoids re-injecting a <style> tag on every React render cycle.
──────────────────────────────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('showroom-kf')) {
  const s = document.createElement('style');
  s.id = 'showroom-kf';
  s.textContent = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

/* ─── Security — only load HTTPS URLs ──────────────────────────── */
function isSafeModelUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ─── Mesh Zone Classifier ─────────────────────────── */
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
  if (['top','surface','stone','counter','slab','granite','marble','quartz'].some((kw) => lower.includes(kw)))   return 'stone';
  if (['sink','faucet','tap','handle','spout','basin','drain','chrome','steel','metal'].some((kw) => lower.includes(kw))) return 'metal';
  if (['cabinet','carcass','door','base','body','panel','drawer','frame','unit','box'].some((kw) => lower.includes(kw))) return 'cabinet';
  if (['socket','outlet','plug','electrical'].some((kw) => lower.includes(kw))) return 'socket';
  return 'default';
}

/* Static shared materials — instantiated once at module load, never recreated */
const SHOWROOM_MATERIALS = {
  stone:   new THREE.MeshStandardMaterial({ color: '#C2B8B0', roughness: 0.50, metalness: 0.02 }),
  metal:   new THREE.MeshStandardMaterial({ color: '#BEC6CE', roughness: 0.15, metalness: 0.92, envMapIntensity: 1.2 }),
  cabinet: new THREE.MeshStandardMaterial({ color: '#5C4030', roughness: 0.70, metalness: 0.05 }),
  socket:  new THREE.MeshStandardMaterial({ color: '#3A3D42', roughness: 0.85, metalness: 0.02 }),
  default: new THREE.MeshStandardMaterial({ color: '#F0ECE8', roughness: 0.8,  metalness: 0.0  }),
};

/* World-space gap between carousel slots */
const SPACING = 4.2;

/* ─── Fallback rendered when a model URL fails security validation ─── */
function SafeModelFallback() {
  return (
    <mesh>
      <boxGeometry args={[1.2, 0.12, 0.7]} />
      <meshStandardMaterial color="#555" wireframe />
    </mesh>
  );
}

/* ─────────────────────────────────────────
   SINGLE MODEL  (memoised — only re-renders when its own props change)
   • Model sub-group spins on a turntable (~1 rev / 22 s)
   • Platform is static — base ring stays grounded
   • 3-tier display stand with gold accent rings
───────────────────────────────────────── */
const ShowroomModel = memo(function ShowroomModel({ structure, position }) {
  const { scene } = useGLTF(structure.model_url, true);
  const spinRef   = useRef();

  /* Apply zone materials once the scene graph is available */
  useEffect(() => {
    scene.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow    = true;
      n.receiveShadow = true;
      let zone = meshZone(n.name);
      if (zone === 'default' && n.parent?.name) zone = meshZone(n.parent.name);
      n.material = SHOWROOM_MATERIALS[zone];
    });
  }, [scene]);

  /* Slow elegant turntable — ~1 full revolution every 22 seconds */
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.285;
  });

  return (
    <group position={position}>

      {/* Spinning model sub-group */}
      <group ref={spinRef}>
        <primitive object={scene} />
      </group>

      {/* 3-tier product display stand (static) */}

      {/* Top face — polished dark disc */}
      <mesh position={[0, -0.548, 0]} receiveShadow>
        <cylinderGeometry args={[1.38, 1.42, 0.038, 72]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.10} metalness={0.80} />
      </mesh>

      {/* Gold accent rim */}
      <mesh position={[0, -0.532, 0]}>
        <cylinderGeometry args={[1.42, 1.44, 0.010, 72]} />
        <meshStandardMaterial color="#C5A059" roughness={0.06} metalness={0.96} />
      </mesh>

      {/* Base plinth */}
      <mesh position={[0, -0.590, 0]} receiveShadow>
        <cylinderGeometry args={[1.55, 1.65, 0.050, 72]} />
        <meshStandardMaterial color="#161210" roughness={0.22} metalness={0.55} />
      </mesh>

      {/* Bottom edge ring */}
      <mesh position={[0, -0.618, 0]}>
        <cylinderGeometry args={[1.62, 1.68, 0.012, 72]} />
        <meshStandardMaterial color="#C5A059" roughness={0.12} metalness={0.88} />
      </mesh>

    </group>
  );
});

/* ─── Placeholder when URL is unsafe ─── */
const UnsafeModelPlaceholder = memo(function UnsafeModelPlaceholder({ position }) {
  return (
    <group position={position}>
      <SafeModelFallback />
    </group>
  );
});

/* ─────────────────────────────────────────
   CAROUSEL GROUP  (memoised)
   Lerps its X toward -currentIndex × SPACING each frame.
   Early-exit when already settled to avoid GPU dirty-marking.
───────────────────────────────────────── */
const CarouselGroup = memo(function CarouselGroup({ structures, currentIndex }) {
  const groupRef = useRef();

  /* Stable positions array — recomputed only when structures changes */
  const positions = useRef([]);
  useEffect(() => {
    positions.current = structures.map((_, i) => [i * SPACING, 0, 0]);
  }, [structures]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target  = -currentIndex * SPACING;
    const current = groupRef.current.position.x;
    /* Skip GPU update when already settled (< 0.1 mm threshold) */
    if (Math.abs(current - target) < 0.0001) return;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      current,
      target,
      1 - Math.pow(0.001, delta),
    );
  });

  return (
    <group ref={groupRef}>
      {structures.map((s, i) =>
        isSafeModelUrl(s.model_url)
          ? <ShowroomModel key={s.id} structure={s} position={[i * SPACING, 0, 0]} />
          : <UnsafeModelPlaceholder key={s.id} position={[i * SPACING, 0, 0]} />
      )}
    </group>
  );
});

/* ─── Wireframe box shown while a GLB is still loading ─── */
function CanvasLoader() {
  return (
    <mesh>
      <boxGeometry args={[1.4, 0.12, 0.7]} />
      <meshStandardMaterial color="#333" wireframe />
    </mesh>
  );
}

/* ─────────────────────────────────────────
   SHOWROOM CANVAS  (exported component)
───────────────────────────────────────── */
export default function ShowroomCanvas({ structures, onStructureSelect }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging,   setIsDragging]   = useState(false);

  /* Clamp index whenever the structures list changes */
  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(0, structures.length - 1)));
  }, [structures]);

  /* Early-exit render for empty list */
  if (!structures?.length) return null;

  /* ── Drag / swipe detection ──────────────────────────────────────── */
  const dragRef = useRef({ active: false, startX: 0, moved: false });

  const navigate = useCallback((dir) => {
    setCurrentIndex((i) =>
      dir > 0
        ? Math.min(i + 1, structures.length - 1)
        : Math.max(i - 1, 0)
    );
  }, [structures.length]);

  const selectCurrent = useCallback(() => {
    if (structures[currentIndex]) onStructureSelect(structures[currentIndex]);
  }, [structures, currentIndex, onStructureSelect]);

  /* Pointer handlers (mouse + stylus) */
  const handlePointerDown = useCallback((e) => {
    dragRef.current = { active: true, startX: e.clientX, moved: false };
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    if (Math.abs(e.clientX - dragRef.current.startX) > 8) dragRef.current.moved = true;
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!dragRef.current.active) return;
    const delta = e.clientX - dragRef.current.startX;
    dragRef.current.active = false;
    setIsDragging(false);
    if      (delta < -55) navigate(+1);
    else if (delta >  55) navigate(-1);
    else if (!dragRef.current.moved) selectCurrent();
  }, [navigate, selectCurrent]);

  const handlePointerLeave = useCallback(() => {
    dragRef.current.active = false;
    setIsDragging(false);
  }, []);

  /* Touch handlers (mobile) */
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    dragRef.current = { active: true, startX: t.clientX, moved: false };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - dragRef.current.startX) > 8) dragRef.current.moved = true;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!dragRef.current.active) return;
    const t = e.changedTouches[0];
    const delta = t.clientX - dragRef.current.startX;
    dragRef.current.active = false;
    if      (delta < -55) navigate(+1);
    else if (delta >  55) navigate(-1);
    else if (!dragRef.current.moved) selectCurrent();
  }, [navigate, selectCurrent]);

  /* Keyboard navigation — ArrowLeft/Right to browse, Enter/Space to select */
  const wrapperRef = useRef();
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')              { e.preventDefault(); navigate(-1); }
      else if (e.key === 'ArrowRight')        { e.preventDefault(); navigate(+1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCurrent(); }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [navigate, selectCurrent]);

  const current = structures[currentIndex];

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="3D Model Showroom — use arrow keys or drag to navigate"
      className="relative w-full h-full select-none overflow-hidden outline-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* R3F Canvas */}
      <Canvas
        shadows
        gl={{ shadowMapType: THREE.PCFShadowMap }}
        camera={{ position: [0, 0.75, 2.1], fov: 72 }}
        style={{
          width:      '100%',
          height:     '100%',
          background: 'radial-gradient(ellipse at 50% 28%, #181818 0%, #070707 100%)',
        }}
      >
        <Suspense fallback={<CanvasLoader />}>

          {/* PROFESSIONAL STUDIO LIGHTING — 4-POINT RIG */}
          <ambientLight intensity={0.04} color="#dce8ff" />

          {/* Key light */}
          <spotLight
            position={[3.5, 6.5, 4.5]}
            intensity={5.0}
            angle={0.28}
            penumbra={0.40}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.00012}
            color="#fff9f2"
          />

          {/* Fill light */}
          <spotLight
            position={[-4.5, 5.0, 3.5]}
            intensity={1.6}
            angle={0.55}
            penumbra={1.0}
            castShadow={false}
            color="#eef2ff"
          />

          {/* Rim / back light */}
          <spotLight
            position={[0.8, 5.5, -5.5]}
            intensity={2.8}
            angle={0.32}
            penumbra={0.60}
            castShadow={false}
            color="#ffffff"
          />

          {/* Top overhead */}
          <spotLight
            position={[0, 7.0, 0.5]}
            intensity={1.8}
            angle={0.40}
            penumbra={0.70}
            castShadow={false}
            color="#fff5e8"
          />

          {/* Kicker */}
          <pointLight
            position={[2.8, -0.1, 2.2]}
            intensity={0.35}
            color="#ffe0b0"
            distance={9}
            decay={2}
          />

          <CarouselGroup structures={structures} currentIndex={currentIndex} />

          <ContactShadows
            position={[0, -0.63, 0]}
            opacity={0.60}
            scale={40}
            blur={0.75}
            far={1.0}
          />

          <Environment preset="studio" />

        </Suspense>
      </Canvas>

      {/* Model name label */}
      {current && (
        <div
          key={current.id}
          style={{
            position:      'absolute',
            bottom:        '2rem',
            left:          '50%',
            transform:     'translateX(-50%)',
            pointerEvents: 'none',
            textAlign:     'center',
            animation:     'fadeSlideUp 0.35s ease forwards',
          }}
        >
          <p style={{
            color:         '#C5A059',
            fontSize:      '11px',
            fontWeight:    '700',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontFamily:    "'Inter', 'Segoe UI', sans-serif",
            textShadow:    '0 2px 12px rgba(0,0,0,0.9)',
          }}>
            {current.name}
          </p>

          <p style={{
            marginTop:     '4px',
            color:         'rgba(197,160,89,0.50)',
            fontSize:      '9px',
            fontWeight:    '500',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily:    "'Inter', 'Segoe UI', sans-serif",
          }}>
            Tap to configure
          </p>

          {structures.length > 1 && (
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '10px' }}>
              {structures.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width:           i === currentIndex ? '18px' : '5px',
                    height:          '5px',
                    borderRadius:    '3px',
                    backgroundColor: i === currentIndex ? '#C5A059' : 'rgba(197,160,89,0.28)',
                    transition:      'all 0.35s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Left arrow */}
      {currentIndex > 0 && (
        <button
          aria-label={`Previous: ${structures[currentIndex - 1]?.name ?? 'previous model'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => navigate(-1)}
          style={{
            position:       'absolute',
            left:           '14px',
            top:            '50%',
            transform:      'translateY(-50%)',
            background:     'rgba(197,160,89,0.08)',
            border:         '1px solid rgba(197,160,89,0.25)',
            borderRadius:   '50%',
            width:          '38px',
            height:         '38px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            color:          'rgba(197,160,89,0.7)',
            fontSize:       '16px',
            lineHeight:     1,
            backdropFilter: 'blur(4px)',
            transition:     'all 0.2s ease',
            zIndex:         20,
          }}
        >‹</button>
      )}

      {/* Right arrow */}
      {currentIndex < structures.length - 1 && (
        <button
          aria-label={`Next: ${structures[currentIndex + 1]?.name ?? 'next model'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => navigate(+1)}
          style={{
            position:       'absolute',
            right:          '14px',
            top:            '50%',
            transform:      'translateY(-50%)',
            background:     'rgba(197,160,89,0.08)',
            border:         '1px solid rgba(197,160,89,0.25)',
            borderRadius:   '50%',
            width:          '38px',
            height:         '38px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            color:          'rgba(197,160,89,0.7)',
            fontSize:       '16px',
            lineHeight:     1,
            backdropFilter: 'blur(4px)',
            transition:     'all 0.2s ease',
            zIndex:         20,
          }}
        >›</button>
      )}
    </div>
  );
}

/* Pre-cache GLBs as soon as their URLs are known (AGENTS.md §C) */
ShowroomCanvas.preload = (url) => {
  if (isSafeModelUrl(url)) useGLTF.preload(url, true);
};
