import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let sharedDracoLoader = null;

/**
 * Returns a singleton DRACOLoader instance configured with the official Google Draco decoders.
 * Preloads the WebAssembly workers so decompression starts instantly.
 */
export const getSharedDracoLoader = () => {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    sharedDracoLoader.preload();
  }
  return sharedDracoLoader;
};

/**
 * Creates and returns a Three.js GLTFLoader instance equipped with:
 * - KHR_draco_mesh_compression support via DRACOLoader (e.g. gltf.report / Draco exports)
 * - EXT_meshopt_compression support via MeshoptDecoder
 */
export const createConfiguredGLTFLoader = () => {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getSharedDracoLoader());
  if (MeshoptDecoder) {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
};
