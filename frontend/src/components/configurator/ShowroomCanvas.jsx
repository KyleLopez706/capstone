import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows, Environment, MeshReflectorMaterial } from "@react-three/drei";
import {
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from "react";
import * as THREE from "three";
import useConfiguratorStore from "../../store/configuratorStore";

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
if (
  typeof document !== "undefined" &&
  !document.getElementById("showroom-kf")
) {
  const s = document.createElement("style");
  s.id = "showroom-kf";
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
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ─── Mesh Zone Classifier ─────────────────────────── */
const EXACT_ZONE_MAP = {
  granite_slab: "stone",
  cabinet_base: "cabinet",
  faucets: "metal",
  sink_bowls: "metal",
  electric_socket: "socket",
};

function meshZone(name = "") {
  const lower = name.trim().toLowerCase();
  for (const [key, zone] of Object.entries(EXACT_ZONE_MAP)) {
    if (key.toLowerCase() === lower) return zone;
  }
  if (
    [
      "wall",
      "walls"
    ].some((kw) => lower.includes(kw))
  )
    return "wall";
  if (
    [
      "floor",
      "ground"
    ].some((kw) => lower.includes(kw))
  )
    return "floor";
  if (
    [
      "top",
      "surface",
      "stone",
      "counter",
      "slab",
      "granite",
      "marble",
      "quartz",
    ].some((kw) => lower.includes(kw))
  )
    return "stone";
  if (
    [
      "sink",
      "faucet",
      "tap",
      "handle",
      "spout",
      "basin",
      "drain",
      "chrome",
      "steel",
      "metal",
    ].some((kw) => lower.includes(kw))
  )
    return "metal";
  if (
    [
      "cabinet",
      "carcass",
      "door",
      "base",
      "body",
      "panel",
      "drawer",
      "frame",
      "unit",
      "box",
    ].some((kw) => lower.includes(kw))
  )
    return "cabinet";
  if (
    ["socket", "outlet", "plug", "electrical"].some((kw) => lower.includes(kw))
  )
    return "socket";
  return "default";
}

/* Static shared materials — instantiated once at module load, never recreated */
const SHOWROOM_MATERIALS = {
  stone: new THREE.MeshStandardMaterial({
    color: "#DBDBDB",
    roughness: 0.55,
    metalness: 0.03,
    envMapIntensity: 0.4,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: "#BEC6CE",
    roughness: 0.15,
    metalness: 0.92,
    envMapIntensity: 0.6,
  }),
  cabinet: new THREE.MeshStandardMaterial({
    color: "#7F5112", // Updated cabinet base color
    roughness: 0.7,
    metalness: 0.05,
  }),
  socket: new THREE.MeshStandardMaterial({
    color: "#3A3D42", // Keep socket dark so it looks like plastic
    roughness: 0.85,
    metalness: 0.02,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: "#DBDBDB",
    roughness: 0.7,
    metalness: 0.0,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: "#DBDBDB",
    roughness: 0.5,
    metalness: 0.05,
  }),
  default: new THREE.MeshStandardMaterial({
    color: "#F4F4F2", // Offwhite fallback
    roughness: 0.8,
    metalness: 0.0,
  }),
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
  const spinRef = useRef();

  /* Apply zone materials once the scene graph is available */
  useEffect(() => {
    scene.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;
      let zone = meshZone(n.name);
      if (zone === "default" && n.parent?.name) zone = meshZone(n.parent.name);
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
        <meshStandardMaterial color="#1e1b18" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Gold accent rim */}
      <mesh position={[0, -0.532, 0]}>
        <cylinderGeometry args={[1.42, 1.44, 0.01, 72]} />
        <meshStandardMaterial
          color="#C5A059"
          roughness={0.06}
          metalness={0.96}
        />
      </mesh>

      {/* Base plinth */}
      <mesh position={[0, -0.59, 0]} receiveShadow>
        <cylinderGeometry args={[1.55, 1.65, 0.05, 72]} />
        <meshStandardMaterial
          color="#161210"
          roughness={0.22}
          metalness={0.55}
        />
      </mesh>

      {/* Bottom edge ring */}
      <mesh position={[0, -0.618, 0]}>
        <cylinderGeometry args={[1.62, 1.68, 0.012, 72]} />
        <meshStandardMaterial
          color="#C5A059"
          roughness={0.12}
          metalness={0.88}
        />
      </mesh>
    </group>
  );
});

/* ─── Placeholder when URL is unsafe ─── */
const UnsafeModelPlaceholder = memo(function UnsafeModelPlaceholder({
  position,
}) {
  return (
    <group position={position}>
      <SafeModelFallback />
    </group>
  );
});

/* ─── Lazy Loaded Model Wrapper ─── */
const LazyShowroomModel = memo(function LazyShowroomModel({ structure, position, isVisible }) {
  const [hasBeenVisible, setHasBeenVisible] = useState(isVisible);
  
  useEffect(() => {
    if (isVisible) setHasBeenVisible(true);
  }, [isVisible]);

  if (!hasBeenVisible) {
    return <UnsafeModelPlaceholder position={position} />;
  }

  return (
    <Suspense fallback={<UnsafeModelPlaceholder position={position} />}>
      <ShowroomModel structure={structure} position={position} />
    </Suspense>
  );
});

/* ─────────────────────────────────────────
   CAROUSEL GROUP  (memoised)
   Lerps its X toward -currentIndex × SPACING each frame.
   Early-exit when already settled to avoid GPU dirty-marking.
───────────────────────────────────────── */
const CarouselGroup = memo(function CarouselGroup({
  structures,
  currentIndex,
}) {
  const groupRef = useRef();

  /* Stable positions array — recomputed only when structures changes */
  const positions = useRef([]);
  useEffect(() => {
    positions.current = structures.map((_, i) => [i * SPACING, 0, 0]);
  }, [structures]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = -currentIndex * SPACING;
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
      {structures.map((s, i) => {
        const isNearby = Math.abs(currentIndex - i) <= 1;
        return isSafeModelUrl(s.model_url) ? (
          <LazyShowroomModel
            key={s.id}
            structure={s}
            position={[i * SPACING, 0, 0]}
            isVisible={isNearby}
          />
        ) : (
          <UnsafeModelPlaceholder key={s.id} position={[i * SPACING, 0, 0]} />
        );
      })}
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
  const selectedStructure = useConfiguratorStore((s) => s.selectedStructure);
  const canvasTheme       = useConfiguratorStore((s) => s.canvasTheme);
  const toggleCanvasTheme = useConfiguratorStore((s) => s.toggleCanvasTheme);
  const lowEndMode        = useConfiguratorStore((s) => s.lowEndMode);
  const toggleLowEndMode  = useConfiguratorStore((s) => s.toggleLowEndMode);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!selectedStructure || !structures?.length) return 0;
    const idx = structures.findIndex((s) => s.id === selectedStructure.id);
    return idx !== -1 ? idx : 0;
  });

  const [isDragging, setIsDragging] = useState(false);

  /* Clamp index whenever the structures list changes */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentIndex((i) => {
      const maxIdx = Math.max(0, (structures?.length || 1) - 1);
      return i > maxIdx ? maxIdx : i;
    });
  }, [structures]);


  /* ── Drag / swipe detection ──────────────────────────────────────── */
  const dragRef = useRef({ active: false, startX: 0, moved: false });

  const navigate = useCallback((dir) => {
    setCurrentIndex((i) => {
      const maxIdx = Math.max(0, (structures?.length || 1) - 1);
      return dir > 0 ? Math.min(i + 1, maxIdx) : Math.max(i - 1, 0);
    });
  }, [structures]);

  const selectCurrent = useCallback(() => {
    if (structures && structures[currentIndex]) onStructureSelect(structures[currentIndex]);
  }, [structures, currentIndex, onStructureSelect]);

  /* Pointer handlers (mouse + stylus) */
  const handlePointerDown = useCallback((e) => {
    dragRef.current = { active: true, startX: e.clientX, moved: false };
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    if (Math.abs(e.clientX - dragRef.current.startX) > 8)
      dragRef.current.moved = true;
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      const delta = e.clientX - dragRef.current.startX;
      dragRef.current.active = false;
      setIsDragging(false);
      if (delta < -55) navigate(+1);
      else if (delta > 55) navigate(-1);
      else if (!dragRef.current.moved) selectCurrent();
    },
    [navigate, selectCurrent],
  );

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
    if (Math.abs(t.clientX - dragRef.current.startX) > 8)
      dragRef.current.moved = true;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      const t = e.changedTouches[0];
      const delta = t.clientX - dragRef.current.startX;
      dragRef.current.active = false;
      if (delta < -55) navigate(+1);
      else if (delta > 55) navigate(-1);
      else if (!dragRef.current.moved) selectCurrent();
    },
    [navigate, selectCurrent],
  );

  /* Keyboard navigation — ArrowLeft/Right to browse, Enter/Space to select */
  const wrapperRef = useRef();
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate(+1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCurrent();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [navigate, selectCurrent]);

  /* Early-exit render for empty list (placed after all hooks to satisfy Rules of Hooks) */
  if (!structures?.length) return null;

  const current = structures[currentIndex];

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="3D Model Showroom — use arrow keys or drag to navigate"
      className="relative w-full h-full select-none overflow-hidden outline-none"
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
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
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ shadowMapType: THREE.PCFShadowMap, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1, 3], fov: 65 }}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent"
        }}
      >
        <color 
          attach="background" 
          args={[
            canvasTheme === 'dark' 
              ? (lowEndMode ? '#1A1F24' : '#0c0d10') 
              : (lowEndMode ? '#A0AEC0' : '#cfcfcf')
          ]} 
        />
        
        {/* Fog perfectly matches the solid background to erase the horizon line */}
        <fog 
          attach="fog" 
          args={[
            canvasTheme === 'dark' 
              ? (lowEndMode ? '#1A1F24' : '#0c0d10') 
              : (lowEndMode ? '#A0AEC0' : '#cfcfcf'), 
            5, 20
          ]} 
        />

        <Suspense fallback={<CanvasLoader />}>
          {/* ── Dynamic PBR Lighting (tuned to preserve texture colors) ── */}
          <ambientLight intensity={lowEndMode ? 0.3 : 0.2} color="#ffffff" />

          <directionalLight
            position={lowEndMode ? [10, 10, 5] : [5, 8, 4]}
            intensity={lowEndMode ? 1.2 : 1.6}
            castShadow
            shadow-mapSize={lowEndMode ? [512, 512] : [1024, 1024]}
            shadow-bias={-0.0001}
            color="#ffffff"
          />

          {!lowEndMode && (
            <spotLight
              position={[0, 6, 1]}
              angle={0.5}
              penumbra={0.6}
              intensity={2.0}
              castShadow
              shadow-mapSize={[1024, 1024]}
              color="#ffffff"
            />
          )}

          <directionalLight position={[-5, 3, -5]} intensity={lowEndMode ? 0.4 : 0.3} color="#c4d4e8" />
          {!lowEndMode && <directionalLight position={[0, 3, -6]} intensity={0.5} color="#ffffff" />}

          <CarouselGroup structures={structures} currentIndex={currentIndex} />

          {/* Reflective Showroom Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.63, 0]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            {lowEndMode ? (
              <meshStandardMaterial 
                color={
                  canvasTheme === 'dark' 
                    ? '#1A1F24' 
                    : '#A0AEC0'
                } 
              />
            ) : (
              <MeshReflectorMaterial
                blur={[200, 100]}
                resolution={256}
                mixBlur={0.5}
                mixStrength={10}
                roughness={0.8}
                depthScale={1}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color={canvasTheme === 'dark' ? '#0c0d10' : '#cfcfcf'}
                metalness={0.6}
              />
            )}
          </mesh>

          {!lowEndMode && (
            <ContactShadows
              position={[0, -0.62, 0]}
              opacity={canvasTheme === 'dark' ? 0.8 : 0.4}
              scale={40}
              blur={1.5}
              far={1.0}
              resolution={256}
            />
          )}

          <Environment preset={lowEndMode ? "city" : "studio"} environmentIntensity={lowEndMode ? 0.3 : 0.3} />
        </Suspense>
      </Canvas>

      {/* Model name label */}
      {current && (
        <div
          key={current.id}
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            textAlign: "center",
            animation: "fadeSlideUp 0.35s ease forwards",
          }}
        >
          <p
            style={{
              color: canvasTheme === 'dark' ? "#F9F9FB" : "#232B32",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              textShadow: canvasTheme === 'dark' 
                ? "0 2px 12px rgba(0,0,0,0.8)" 
                : "0 2px 12px rgba(255,255,255,0.9)",
            }}
          >
            {current.name}
          </p>

          <p
            style={{
              marginTop: "4px",
              color: "#C5A059",
              fontSize: "9px",
              fontWeight: "500",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
            }}
          >
            Tap to configure
          </p>

          {structures.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: "5px",
                justifyContent: "center",
                marginTop: "10px",
              }}
            >
              {structures.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentIndex ? "18px" : "5px",
                    height: "5px",
                    borderRadius: "3px",
                    backgroundColor:
                      i === currentIndex ? "#C5A059" : "rgba(197,160,89,0.28)",
                    transition: "all 0.35s ease",
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
          aria-label={`Previous: ${structures[currentIndex - 1]?.name ?? "previous model"}`}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            navigate(-1);
          }}
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(197,160,89,0.15)",
            border: "1px solid rgba(197,160,89,0.5)",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#C5A059",
            fontSize: "26px",
            lineHeight: 1,
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
            zIndex: 20,
          }}
        >
          ‹
        </button>
      )}

      {/* Right arrow */}
      {currentIndex < structures.length - 1 && (
        <button
          aria-label={`Next: ${structures[currentIndex + 1]?.name ?? "next model"}`}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            navigate(+1);
          }}
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(197,160,89,0.15)",
            border: "1px solid rgba(197,160,89,0.5)",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#C5A059",
            fontSize: "26px",
            lineHeight: 1,
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
            zIndex: 20,
          }}
        >
          ›
        </button>
      )}

      <div 
        style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10, display: "flex", gap: "8px" }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Performance Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLowEndMode();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: lowEndMode ? "rgba(197,160,89,0.2)" : (canvasTheme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
            color: lowEndMode ? "#C5A059" : (canvasTheme === 'dark' ? "#F9F9FB" : "#232B32"),
            border: lowEndMode ? "1px solid rgba(197,160,89,0.4)" : (canvasTheme === 'dark' ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)"),
            backdropFilter: "blur(4px)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = lowEndMode ? "rgba(197,160,89,0.3)" : (canvasTheme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)");
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = lowEndMode ? "rgba(197,160,89,0.2)" : (canvasTheme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
          }}
          title={lowEndMode ? "High Performance (Low Quality)" : "High Quality (Low Performance)"}
        >
          {lowEndMode ? (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 15.655 9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.048-2.194L11.412 2.25l-.42 4.058m5.053 5.053L20.25 10.5h-5.412m-3.158 5.412 1.554 1.666" />
            </svg>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCanvasTheme();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: canvasTheme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            color: canvasTheme === 'dark' ? "#F9F9FB" : "#232B32",
            border: canvasTheme === 'dark' ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)",
            backdropFilter: "blur(4px)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = canvasTheme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = canvasTheme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
          }}
          title={canvasTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {canvasTheme === 'dark' ? (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* Pre-cache GLBs as soon as their URLs are known (AGENTS.md §C) */
ShowroomCanvas.preload = (url) => {
  if (isSafeModelUrl(url)) useGLTF.preload(url, true);
};
