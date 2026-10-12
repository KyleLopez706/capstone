import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createConfiguredGLTFLoader } from '../utils/gltfLoader';
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * Model3DPreview - Lightweight, Simplified 3D GLB Model Inspector
 *
 * Provides a fast, hardware-accelerated 3D viewport for rotating and inspecting
 * models. Uses on-demand rendering (0 idle GPU/CPU load) with no heavy shadow maps
 * or complex post-processing to ensure silky-smooth, zero-lag rotation.
 */
export default function Model3DPreview({
  file,
  className = 'w-full h-64 sm:h-72',
  onModelLoaded,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const currentModelRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onModelLoadedRef = useRef(onModelLoaded);
  useEffect(() => {
    onModelLoadedRef.current = onModelLoaded;
  }, [onModelLoaded]);

  // Initialize Three.js scene, camera, renderer, and controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 280;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f5f7);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    camera.position.set(3, 2.5, 4);
    cameraRef.current = camera;

    // 3. WebGL Renderer (optimized: no shadows, clamped pixel ratio for silky smoothness)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'default',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const render = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    // 4. Orbit Controls (on-demand rendering: only renders when rotating/zooming)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; // Instant 1:1 responsive rotation without inertial lag
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.minDistance = 0.2;
    controls.maxDistance = 30;
    controls.addEventListener('change', render);
    controlsRef.current = controls;

    // 5. Lightweight Studio Lighting (zero shadow-map overhead)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // 6. Simple Ground Grid
    const grid = new THREE.GridHelper(10, 16, 0xc5a059, 0xe2e8f0);
    grid.position.y = 0;
    scene.add(grid);

    // Initial render
    render();

    // 7. Responsive Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
      render();
    });
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
      if (controlsRef.current) {
        controlsRef.current.removeEventListener('change', render);
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Load and parse GLB file
  useEffect(() => {
    if (!file || !sceneRef.current) return;

    let isCancelled = false;
    Promise.resolve().then(() => {
      if (!isCancelled) {
        setLoading(true);
        setError(null);
      }
    });

    const render = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    // Clean up previous model from scene
    if (currentModelRef.current) {
      sceneRef.current.remove(currentModelRef.current);
      currentModelRef.current.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      currentModelRef.current = null;
    }

    const loader = createConfiguredGLTFLoader();

    const handleGltfLoaded = (gltf) => {
      if (isCancelled || !sceneRef.current) return;

      const model = gltf.scene;

      // Compute bounding box
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center model around (0, 0, 0) and position base on grid plane (y = 0)
      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;
      model.position.y += size.y / 2;

      sceneRef.current.add(model);
      currentModelRef.current = model;

      // Position camera nicely according to model dimensions
      const maxDim = Math.max(size.x, size.y, size.z, 0.4);
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      if (camera && controls) {
        const fov = camera.fov * (Math.PI / 180);
        let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        dist = Math.max(dist * 1.8, 1.2);

        camera.position.set(dist * 0.9, dist * 0.7, dist);
        camera.near = Math.max(maxDim / 100, 0.01);
        camera.far = Math.max(maxDim * 100, 50);
        camera.updateProjectionMatrix();

        controls.target.set(0, size.y / 2, 0);
        controls.update();
      }

      setLoading(false);
      render();

      const length = Math.max(Number(Math.max(size.x, size.z).toFixed(2)), 0.1);
      const width = Math.max(Number(Math.min(size.x, size.z).toFixed(2)), 0.1);
      const height = Math.max(Number(size.y.toFixed(2)), 0.1);

      if (onModelLoadedRef.current) {
        onModelLoadedRef.current({ length, width, height });
      }
    };

    const handleLoadError = (err) => {
      if (isCancelled) return;
      console.warn('[Model3DPreview] GLB load error:', err);
      setError('Unable to parse 3D file. Please ensure it is a valid .glb export.');
      setLoading(false);
    };

    if (typeof file === 'string') {
      loader.load(file, handleGltfLoaded, undefined, handleLoadError);
    } else if (file instanceof File || (typeof file === 'object' && file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          loader.parse(e.target.result, '', handleGltfLoaded, handleLoadError);
        } catch (err) {
          handleLoadError(err);
        }
      };
      reader.onerror = handleLoadError;
      reader.readAsArrayBuffer(file);
    }

    return () => {
      isCancelled = true;
    };
  }, [file]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#F4F5F7] select-none ${className}`}
    >
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#F4F5F7]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
          <Loader2 size={28} className="animate-spin text-[#C5A059]" />
          <p className="text-xs font-medium text-[#232B32]">Loading 3D Model...</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-red-50/90 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
            <AlertTriangle size={20} />
          </div>
          <h4 className="text-sm font-bold text-red-900 mb-1">Failed to Load 3D Model</h4>
          <p className="text-xs text-red-700 max-w-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
