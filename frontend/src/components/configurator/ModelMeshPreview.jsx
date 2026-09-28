import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { analyzeGeometry, processSceneMeshes } from '../../utils/meshSegmentation';

// Materials for live visual differentiation in the Admin Preview
const PREVIEW_STONE_MAT = new THREE.MeshStandardMaterial({
  color: '#C5A059', // Champagne Gold / Polished Stone representation
  roughness: 0.25,
  metalness: 0.1,
});

const PREVIEW_CABINET_MAT = new THREE.MeshStandardMaterial({
  color: '#3A3D42', // Deep Slate / Cabinet carcass representation
  roughness: 0.85,
  metalness: 0.05,
});

const PREVIEW_METAL_MAT = new THREE.MeshStandardMaterial({
  color: '#ECEFF2', // Radiant silver metallic chrome (Sink, Stove, Faucet)
  roughness: 0.15,
  metalness: 0.80,
});

function SegmentedModelDisplay({ scene, config }) {
  const { stoneMeshes, cabinetMeshes, metalMeshes } = useMemo(() => {
    if (!scene) return { stoneMeshes: [], cabinetMeshes: [], metalMeshes: [] };
    const cloned = scene.clone(true);
    return processSceneMeshes(cloned, config);
  }, [scene, config]);

  return (
    <group>
      {stoneMeshes.map((mesh, i) => (
        <primitive
          key={`stone-${mesh.name || i}-${config.preset}-${config.cutoff}`}
          object={mesh}
          material={PREVIEW_STONE_MAT}
        />
      ))}
      {cabinetMeshes.map((mesh, i) => (
        <primitive
          key={`cabinet-${mesh.name || i}-${config.preset}-${config.cutoff}`}
          object={mesh}
          material={PREVIEW_CABINET_MAT}
        />
      ))}
      {(metalMeshes || []).map((mesh, i) => (
        <primitive
          key={`metal-${mesh.name || i}-${config.preset}-${config.cutoff}`}
          object={mesh}
          material={PREVIEW_METAL_MAT}
        />
      ))}
    </group>
  );
}

export default function ModelMeshPreview({ file, preset, cutoff, onAnalysisComplete }) {
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const analysisReportedRef = useRef(false);

  useEffect(() => {
    if (!file) {
      setScene(null);
      setError(null);
      return;
    }

    let isMounted = true;

    setLoading(true);
    setError(null);
    analysisReportedRef.current = false;

    const loader = new GLTFLoader();

    // Enable Google CDN Draco decoder for compressed GLBs (standard in Meshy AI / Blender)
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
    loader.setDRACOLoader(dracoLoader);

    const handleGLTFSuccess = (gltf) => {
      if (!isMounted) return;

      let analysis = null;
      try {
        analysis = analyzeGeometry(gltf.scene);
      } catch (analysisErr) {
        console.warn('[ModelMeshPreview] Analysis fallback:', analysisErr);
        analysis = { recommendedPreset: 'countertop', confidence: 'low', hasMultipleMeshes: false, meshCount: 1 };
      }

      if (onAnalysisComplete && !analysisReportedRef.current) {
        analysisReportedRef.current = true;
        onAnalysisComplete(analysis);
      }

      setScene(gltf.scene);
      setLoading(false);
    };

    const handleGLTFError = (err) => {
      if (!isMounted) return;
      console.error('[ModelMeshPreview] Error loading GLB:', err);
      const errorMsg = err?.message || 'Could not parse 3D model. Ensure it is a valid .glb file.';
      setError(errorMsg);
      setLoading(false);
    };

    const loadGLB = async () => {
      try {
        if (typeof file === 'string') {
          loader.load(file, handleGLTFSuccess, undefined, handleGLTFError);
        } else if (file instanceof Blob || file instanceof File) {
          // Read directly as ArrayBuffer — eliminates blob URL fetch issues and preserves binary data
          const buffer = await file.arrayBuffer();
          loader.parse(buffer, '', handleGLTFSuccess, handleGLTFError);
        } else {
          throw new Error('Invalid file format provided for preview');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[ModelMeshPreview] Exception loading GLB:', err);
        setError(err.message || 'Failed to preview 3D model.');
        setLoading(false);
      }
    };

    loadGLB();

    return () => {
      isMounted = false;
      dracoLoader.dispose();
    };
  }, [file]);

  const config = useMemo(() => ({
    preset: preset || 'countertop',
    cutoff: cutoff !== undefined ? cutoff : 0.82,
    includeWaterfall: preset === 'waterfall',
  }), [preset, cutoff]);

  return (
    <div className="relative w-full h-64 md:h-72 rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#F9F9FB] shadow-inner flex flex-col">
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#F9F9FB]/90 backdrop-blur-sm gap-2">
          <Loader2 className="animate-spin text-[#C5A059]" size={28} />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#232B32]">
            Analyzing 3D Geometry...
          </p>
        </div>
      )}

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-red-600 gap-2">
          <AlertCircle size={28} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : scene ? (
        <>
          <Canvas
            shadows
            camera={{ position: [0, 1.2, 2.5], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#b0c4de" />

            <Center top>
              <SegmentedModelDisplay scene={scene} config={config} />
            </Center>

            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.4}
              scale={5}
              blur={1.5}
              far={1.0}
            />

            <OrbitControls
              makeDefault
              enablePan={false}
              minDistance={0.8}
              maxDistance={6}
              autoRotate={false}
            />
          </Canvas>

          {/* Interactive Legend Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FFFFFF]/90 backdrop-blur-md border border-[#E2E8F0] text-xs shadow-sm pointer-events-none">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#C5A059] shadow-sm shrink-0" />
                <span className="font-semibold text-[#232B32]">Stone Surface</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#94A3B8] shadow-sm shrink-0" />
                <span className="font-semibold text-[#232B32]">Metal (Sink/Stove/Faucet)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#3A3D42] shadow-sm shrink-0" />
                <span className="font-semibold text-[#6B7280]">Cabinets</span>
              </div>
            </div>
            <span className="text-[11px] text-[#9CA3AF] font-medium hidden sm:inline">
              Drag to rotate & inspect
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF]">
          <RefreshCw size={24} className="mb-2 opacity-50" />
          <p className="text-xs">Select or drop a 3D model to see the live segment preview</p>
        </div>
      )}
    </div>
  );
}
