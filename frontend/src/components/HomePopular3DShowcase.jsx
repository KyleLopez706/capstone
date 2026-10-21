import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createConfiguredGLTFLoader } from '../utils/gltfLoader';
import { useNavigate } from 'react-router-dom';
import useConfiguratorStore from '../store/configuratorStore';
import {
  Sparkles,
  Eye,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Box,
  Layers,
  Building2,
  Maximize2,
  Zap,
} from 'lucide-react';

const DEFAULT_STRUCTURES = [
  {
    id: 7,
    name: 'Kitchen Countertop',
    structure_type: 'countertop',
    base_length: 2.4,
    base_width: 0.6,
    dimensions: '2.4m × 0.6m',
    category: 'Kitchen',
    modelBadge: 'Countertop 3D Model',
    count: 19,
    description:
      'Bespoke executive kitchen surface engineered for culinary spaces. Features integrated sink cutout, seamless mitered edge profile, and splashboard siding.',
    model_url:
      'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/kitchen_countertop_v5-v1.glb',
  },
  {
    id: 3,
    name: 'Bathroom Countertop',
    structure_type: 'countertop',
    base_length: 1.2,
    base_width: 0.6,
    dimensions: '1.2m × 0.6m',
    category: 'Vanity',
    modelBadge: 'Vanity 3D Model',
    count: 9,
    description:
      'Luxury master vanity countertop featuring sleek proportions, splash guard siding, and under-mount basin integration for spa-grade hospitality.',
    model_url:
      'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/bathroom_countertop_v5-v1.glb',
  },
  {
    id: 4,
    name: 'Island Countertop',
    structure_type: 'island',
    base_length: 2.4,
    base_width: 1.0,
    dimensions: '2.4m × 1.0m',
    category: 'Island',
    modelBadge: 'Waterfall Island 3D Model',
    count: 5,
    description:
      'Dramatic centerpiece waterfall island with expansive preparation area and monolithic dual-sided stone returns for contemporary open layouts.',
    model_url:
      'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/island_countertop_v5-v1.glb',
  },
];

export default function HomePopular3DShowcase({
  popularStones = [],
  popularProjectTypes = [],
}) {
  const navigate = useNavigate();
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);
  const setAppMode = useConfiguratorStore((s) => s.setAppMode);

  // Tab View Mode: 'stones' (Popular Stone Designs) | 'projects' (Popular Project Types & 3D Models)
  const [viewMode, setViewMode] = useState('stones');

  // Top 3 Stones
  const top3Stones = popularStones.slice(0, 3);
  const [activeStoneIndex, setActiveStoneIndex] = useState(0);
  const activeStone = top3Stones[activeStoneIndex] || top3Stones[0] || null;

  // Top 3 Project Types / 3D Models
  const effectiveProjects =
    popularProjectTypes.length >= 3
      ? popularProjectTypes.slice(0, 3)
      : DEFAULT_STRUCTURES;

  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const activeStructure =
    effectiveProjects[activeProjectIndex] || effectiveProjects[0];

  // Three.js References
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const stoneMeshesRef = useRef([]);
  const animFrameRef = useRef(null);
  const loadIdRef = useRef(0);

  const [loadingModel, setLoadingModel] = useState(true);
  const [textureLoading, setTextureLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // 1. Initialize Three.js Scene, Camera, Renderer, Pedestal
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 420;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x15191e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(2.8, 1.8, 3.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 6.0;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 1.0);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc5a059, 1.5);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Luxury Ground Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(2.4, 2.5, 0.08, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2429,
      roughness: 0.6,
      metalness: 0.1,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.55;
    scene.add(pedestal);

    // Gold rim on pedestal
    const ringGeo = new THREE.RingGeometry(2.38, 2.45, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc5a059,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.508;
    scene.add(ring);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      if (
        rendererRef.current?.domElement &&
        rendererRef.current.domElement.parentNode
      ) {
        rendererRef.current.domElement.parentNode.removeChild(
          rendererRef.current.domElement
        );
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Update OrbitControls autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // 2. Texture Application Helper
  const applyStoneTextureToMeshes = useCallback((meshes, stone) => {
    if (!meshes || meshes.length === 0 || !stone) return;

    const textureUrl = stone.image || stone.color_url;
    if (!textureUrl) return;

    setTextureLoading(true);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    textureLoader.load(
      textureUrl,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        texture.colorSpace = THREE.SRGBColorSpace;

        const stoneMat = new THREE.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.18,
          metalness: 0.02,
          clearcoat: 0.95,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.2,
        });

        meshes.forEach((mesh) => {
          mesh.material = stoneMat;
        });

        setTextureLoading(false);
      },
      undefined,
      (err) => {
        console.warn('[HomePopular3DShowcase] Texture apply notice:', err);
        setTextureLoading(false);
      }
    );
  }, []);

  // 3. Dynamic GLTF Model Loading: swaps when activeStructure changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const modelUrl =
      activeStructure?.model_url ||
      'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/kitchen_countertop_v5-v1.glb';

    setLoadingModel(true);
    const currentLoadId = ++loadIdRef.current;

    // Clean up previous model if any
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
      stoneMeshesRef.current = [];
    }

    const loader = createConfiguredGLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        // Guard against race conditions if user switched structure quickly
        if (currentLoadId !== loadIdRef.current) return;

        const root = gltf.scene;
        modelRef.current = root;

        // Center and normalize scale
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        root.position.sub(center);
        root.position.y = -0.5;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 2.5) {
          const s = 2.2 / maxDim;
          root.scale.set(s, s, s);
        }

        // Identify stone, cabinet, and metal meshes
        const stoneMeshes = [];
        root.traverse((child) => {
          if (child.isMesh) {
            const name = (child.name || '').toLowerCase();
            const isStone = [
              'top',
              'surface',
              'stone',
              'counter',
              'granite',
              'slab',
              'wall',
              'floor',
              'tile',
            ].some((kw) => name.includes(kw));

            if (isStone) {
              stoneMeshes.push(child);
            } else if (
              ['cabinet', 'base', 'door', 'wood', 'drawer'].some((kw) =>
                name.includes(kw)
              )
            ) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x24282e,
                roughness: 0.75,
                metalness: 0.05,
              });
            } else if (
              ['sink', 'faucet', 'metal', 'chrome', 'steel', 'fixture'].some(
                (kw) => name.includes(kw)
              )
            ) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xd8dde4,
                roughness: 0.15,
                metalness: 0.85,
              });
            }
          }
        });

        // Fallback: If no mesh matched stone keywords, designate top-most mesh as stone
        if (stoneMeshes.length === 0) {
          const allMeshes = [];
          root.traverse((child) => {
            if (child.isMesh) allMeshes.push(child);
          });
          if (allMeshes.length > 0) {
            allMeshes.sort((a, b) => {
              const bA = new THREE.Box3().setFromObject(a);
              const bB = new THREE.Box3().setFromObject(b);
              return bB.max.y - bA.max.y;
            });
            stoneMeshes.push(allMeshes[0]);
          }
        }

        stoneMeshesRef.current = stoneMeshes;
        scene.add(root);
        setLoadingModel(false);

        // Apply current active stone texture onto the freshly loaded structure
        if (activeStone) {
          applyStoneTextureToMeshes(stoneMeshes, activeStone);
        }
      },
      undefined,
      (err) => {
        console.warn('[HomePopular3DShowcase] GLTF load notice:', err);
        if (currentLoadId === loadIdRef.current) setLoadingModel(false);
      }
    );
  }, [activeStructure?.model_url, activeStructure?.id, applyStoneTextureToMeshes, activeStone]);

  // 4. Update Texture when Active Stone changes
  useEffect(() => {
    if (activeStone && stoneMeshesRef.current.length > 0) {
      applyStoneTextureToMeshes(stoneMeshesRef.current, activeStone);
    }
  }, [activeStone, applyStoneTextureToMeshes]);

  // 5. Launch 3D Configurator with BOTH structure and stone pre-loaded
  const handleLaunchConfigurator = (structure, stone) => {
    const targetStructure = structure || activeStructure || effectiveProjects[0];
    const targetStone = stone || activeStone || top3Stones[0];

    if (targetStone) {
      setMaterial({
        ...targetStone,
        color_url: targetStone.color_url || targetStone.image,
      });
    }

    if (targetStructure) {
      useConfiguratorStore.getState().setStructure({
        id: targetStructure.id,
        name: targetStructure.name,
        base_length: targetStructure.base_length,
        base_width: targetStructure.base_width,
        model_url: targetStructure.model_url,
        structure_type: targetStructure.structure_type,
      });
    }

    setAppMode('configurator');
    navigate('/configurator-3d');
  };

  const rankBadges = [
    { label: '#1 Most Popular', bg: '#C5A059', text: '#FFFFFF' },
    { label: '#2 Top Choice', bg: '#232B32', text: '#F9F9FB' },
    { label: '#3 Trending', bg: '#3B82F6', text: '#FFFFFF' },
  ];

  return (
    <div className="w-full bg-[#1C2026] border border-[#2D343E] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
      {/* Decorative luxury gradient glow */}
      <div
        className="absolute top-0 right-1/4 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #C5A059 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-[#2D343E] relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} /> Client Insights &amp; Market Demand
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#F9F9FB]">
            {viewMode === 'stones'
              ? 'Top 3 Popular Stone Designs in 3D'
              : 'Top 3 Popular Project Types & 3D Models'}
          </h3>
          <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1 max-w-2xl leading-relaxed">
            {viewMode === 'stones'
              ? 'Real-time popular stone surfaces ranked according to client quotation requests. Tap any stone to project its realistic veining onto the 3D model.'
              : 'Top-demanded architectural structures ranked from live client inquiries. Tap any project to load its authentic 3D model and inspect spatial proportions.'}
          </p>
        </div>

        {/* Action Controls: Mode Switcher & Auto-Rotate */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Showcase Tab Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[#15191E] border border-[#2D343E]">
            <button
              onClick={() => setViewMode('stones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'stones'
                  ? 'bg-[#C5A059] text-[#232B32] shadow-sm font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F9F9FB]'
              }`}
            >
              <Sparkles size={12} />
              <span>Popular Stones</span>
            </button>
            <button
              onClick={() => setViewMode('projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'projects'
                  ? 'bg-[#C5A059] text-[#232B32] shadow-sm font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F9F9FB]'
              }`}
            >
              <Building2 size={12} />
              <span>Popular Projects</span>
            </button>
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
              autoRotate
                ? 'bg-[#C5A059]/20 text-[#C5A059] border-[#C5A059]/40'
                : 'bg-[#232B32] text-[#9CA3AF] border-[#2D343E] hover:text-[#F9F9FB]'
            }`}
            title="Toggle 3D Orbit Auto-Rotation"
          >
            <RotateCcw
              size={13}
              className={autoRotate ? 'animate-spin' : ''}
              style={{ animationDuration: '6s' }}
            />
            {autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
          </button>
        </div>
      </div>

      {/* Main Grid: 3D Viewport Left, Popular Cards Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* 3D Viewport Column (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative w-full h-[360px] sm:h-[430px] rounded-2xl overflow-hidden bg-[#15191E] border border-[#2D343E] shadow-inner group">
            {/* Three.js Canvas Container */}
            <div
              ref={containerRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Loading Indicator */}
            {loadingModel && (
              <div className="absolute inset-0 bg-[#15191E]/90 flex flex-col items-center justify-center gap-3 text-xs text-[#9CA3AF]">
                <div className="w-8 h-8 rounded-full border-2 border-[#C5A059] border-t-transparent animate-spin" />
                <span>
                  Loading {activeStructure?.name || '3D Model'} Structure...
                </span>
              </div>
            )}

            {/* Texture Switch Shimmer */}
            {textureLoading && !loadingModel && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#C5A059]/40 text-[#C5A059] text-xs font-semibold flex items-center gap-2 animate-pulse">
                <Box size={14} /> Applying Stone Veining...
              </div>
            )}

            {/* Floating Model Overlay Card */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-lg overflow-hidden border border-white/20 shrink-0 relative"
                  style={{
                    backgroundColor: activeStone?.hex_code || '#232B32',
                  }}
                >
                  {activeStone?.image && (
                    <img
                      src={activeStone.image}
                      alt={activeStone.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#F9F9FB] text-sm leading-tight truncate">
                      {activeStructure?.name}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30">
                      {activeStone?.name || 'Stone Surface'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">
                    {activeStructure?.dimensions || '2.4m × 0.6m'} · Drag to
                    orbit · Pinch/scroll to inspect
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  handleLaunchConfigurator(activeStructure, activeStone)
                }
                className="px-4 py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
              >
                <span>Customize in 3D</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Cards Column (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#C5A059] flex items-center gap-1.5">
              {viewMode === 'stones' ? (
                <>
                  <Layers size={13} /> Select Popular Stone to Preview in 3D:
                </>
              ) : (
                <>
                  <Building2 size={13} /> Select Project Type to Load 3D Model:
                </>
              )}
            </p>
            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
              Live Ranking
            </span>
          </div>

          {/* ════ TAB 1: POPULAR STONE DESIGNS ════ */}
          {viewMode === 'stones' &&
            top3Stones.map((stone, idx) => {
              const isSelected = activeStoneIndex === idx;
              const rank = rankBadges[idx] || rankBadges[0];
              const price = stone.price_per_sqm || 4500;
              const stockStatus = stone.stock_status || 'available';

              const stockLabels = {
                available: { text: 'In Stock', bg: '#ECFDF5', color: '#047857' },
                limited_stock: {
                  text: 'Limited Stock',
                  bg: '#FFFBEB',
                  color: '#B45309',
                },
                restocking_soon: {
                  text: 'Restocking Soon',
                  bg: '#EFF6FF',
                  color: '#1D4ED8',
                },
                out_of_stock: {
                  text: 'Out of Stock',
                  bg: '#FEF2F2',
                  color: '#B91C1C',
                },
              }[stockStatus] || {
                text: 'In Stock',
                bg: '#ECFDF5',
                color: '#047857',
              };

              return (
                <div
                  key={stone.id || stone.name || idx}
                  onClick={() => setActiveStoneIndex(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-[#232B32] border-[#C5A059] shadow-lg shadow-[#C5A059]/10'
                      : 'bg-[#181C22] border-[#2D343E] hover:border-[#4B5563] hover:bg-[#1E232B]'
                  }`}
                  style={{
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  {/* Top Row: Rank Badge + Stock Availability + Price */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs"
                        style={{ backgroundColor: rank.bg, color: rank.text }}
                      >
                        {rank.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: stockLabels.bg,
                          color: stockLabels.color,
                        }}
                      >
                        {stockLabels.text}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-[#C5A059]">
                        ₱
                        {Number(price).toLocaleString('en-PH', {
                          minimumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] ml-1">/ m²</span>
                    </div>
                  </div>

                  {/* Middle Row: Thumbnail + Stone Name & Description */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#2A313C] relative">
                      {stone.image && (
                        <img
                          src={stone.image}
                          alt={stone.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#C5A059]/20 flex items-center justify-center">
                          <CheckCircle2 size={18} className="text-[#C5A059]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-[#F9F9FB] truncate flex items-center gap-2">
                        {stone.name}
                        {isSelected && (
                          <span className="text-[10px] font-medium text-[#C5A059] flex items-center gap-1">
                            <Eye size={11} /> 3D Applied
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-0.5 leading-relaxed">
                        {stone.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Quick Action Links */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-[11px] text-[#9CA3AF]">
                      {stone.orderCount
                        ? `${stone.orderCount} quotation requests`
                        : 'High architectural demand'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchConfigurator(activeStructure, stone);
                      }}
                      className="text-[#C5A059] hover:text-[#e8c97a] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Configure in 3D</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

          {/* ════ TAB 2: POPULAR PROJECT TYPES & 3D MODELS ════ */}
          {viewMode === 'projects' &&
            effectiveProjects.map((project, idx) => {
              const isSelected = activeProjectIndex === idx;
              const rank = rankBadges[idx] || rankBadges[0];
              const dimensions =
                project.dimensions ||
                `${project.base_length || 2.4}m × ${project.base_width || 0.6}m`;

              return (
                <div
                  key={project.id || project.name || idx}
                  onClick={() => setActiveProjectIndex(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-[#232B32] border-[#C5A059] shadow-lg shadow-[#C5A059]/10'
                      : 'bg-[#181C22] border-[#2D343E] hover:border-[#4B5563] hover:bg-[#1E232B]'
                  }`}
                  style={{
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  {/* Top Row: Rank Badge + Category + Dimensions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs"
                        style={{ backgroundColor: rank.bg, color: rank.text }}
                      >
                        {rank.label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#C5A059] border border-white/10">
                        {project.category || project.structure_type || 'Structure'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[#9CA3AF] text-xs font-medium">
                      <Maximize2 size={12} className="text-[#C5A059]" />
                      <span>{dimensions}</span>
                    </div>
                  </div>

                  {/* Middle Row: Structure Icon + Name & Model Specification */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-14 h-14 rounded-xl border border-white/10 shrink-0 bg-[#2A313C] flex items-center justify-center text-[#C5A059] relative">
                      <Building2 size={24} />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#C5A059]/20 rounded-xl flex items-center justify-center">
                          <CheckCircle2 size={18} className="text-[#C5A059]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-[#F9F9FB] truncate flex items-center gap-2">
                        {project.name}
                        {isSelected && (
                          <span className="text-[10px] font-medium text-[#C5A059] flex items-center gap-1">
                            <Box size={11} /> 3D Loaded
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-0.5 leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: 3D Model badge + Count + Configure CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-[11px] text-[#9CA3AF]">
                      {project.count
                        ? `${project.count} quotation requests`
                        : 'High architectural demand'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchConfigurator(project, activeStone);
                      }}
                      className="text-[#C5A059] hover:text-[#e8c97a] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Configure in 3D</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

          {/* Dynamic Ranking Indicator Note */}
          <div className="mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#9CA3AF] flex items-center gap-2">
            <Zap size={13} className="text-[#C5A059] shrink-0" />
            <span>
              <strong>Real-Time Dynamic Rankings:</strong> When a stone design
              or project type receives new quotation requests, it will
              automatically rise in rank and take over #1.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
