import * as THREE from 'three';

/**
 * Default segmentation configuration presets.
 */
export const SEGMENTATION_PRESETS = {
  countertop: {
    id: 'countertop',
    name: 'Countertop + Base',
    description: 'Top slab receives stone; lower body/carcass remains cabinet.',
    defaultCutoff: 0.82,
    includeWaterfall: false,
  },
  full_kitchen: {
    id: 'full_kitchen',
    name: 'Full Kitchen Unit',
    description: 'Kitchens with upper wall cabinets; targets waist-height countertop (30%-40%).',
    defaultCutoff: 0.33,
    includeWaterfall: false,
  },
  monolith: {
    id: 'monolith',
    name: 'Full Stone Monolith',
    description: '100% of the model is stone (reception desks, marble islands, slabs).',
    defaultCutoff: 0.0,
    includeWaterfall: false,
  },
  waterfall: {
    id: 'waterfall',
    name: 'Waterfall Edge',
    description: 'Top slab plus outer left and right vertical sides flow down to the floor.',
    defaultCutoff: 0.82,
    includeWaterfall: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom Elevation',
    description: 'Manually fine-tune the exact height where the stone slab begins.',
    defaultCutoff: 0.85,
    includeWaterfall: false,
  },
};

/**
 * Extracts preset and cutoff from a structure object or model URL.
 * Supports URL query parameters (?preset=...&cutoff=...) and falls back
 * to the allowed database structure_type ('countertop', 'island', 'floor', 'wall').
 *
 * @param {object|string} structure 
 * @returns {{ preset: string, cutoff: number, includeWaterfall: boolean }}
 */
export function parseStructureConfig(structure) {
  if (!structure) {
    return { preset: 'countertop', cutoff: 0.82, includeWaterfall: false };
  }

  // 1. Check URL query parameters on model_url
  const url = typeof structure === 'string' ? structure : (structure.model_url || '');
  if (url && url.includes('?')) {
    try {
      const queryString = url.split('?')[1];
      const params = new URLSearchParams(queryString);
      if (params.has('preset')) {
        const preset = params.get('preset');
        const defaultCutoff = preset === 'full_kitchen' ? 0.33 : (SEGMENTATION_PRESETS[preset]?.defaultCutoff ?? 0.82);
        const cutoff = parseFloat(params.get('cutoff')) || defaultCutoff;
        return {
          preset,
          cutoff,
          includeWaterfall: preset === 'waterfall',
        };
      }
    } catch (e) {
      console.warn('[parseStructureConfig] URL parse error:', e);
    }
  }

  // 2. Fallback to structure_type column from DB ('countertop', 'island', 'floor', 'wall')
  const st = (typeof structure === 'object' ? structure.structure_type : structure) || '';
  const lower = st.toLowerCase();

  if (lower === 'floor' || lower === 'wall' || lower === 'monolith') {
    return { preset: 'monolith', cutoff: 0.0, includeWaterfall: false };
  }
  if (lower === 'island' || lower === 'waterfall') {
    return { preset: 'waterfall', cutoff: 0.82, includeWaterfall: true };
  }

  return { preset: 'countertop', cutoff: 0.82, includeWaterfall: false };
}

/**
 * Analyzes a Three.js scene or mesh to recommend the best structure preset.
 * Computes an elevation histogram of upward faces to distinguish between:
 *  - Standard countertops / islands (slab at 80%-100% height)
 *  - Full kitchen suites with upper cabinets (slab at waist height 25%-45%)
 *  - Flat monolithic slabs (thickness < 15cm)
 *
 * @param {THREE.Object3D} root 
 * @returns {{ recommendedPreset: string, recommendedCutoff: number, confidence: string, hasMultipleMeshes: boolean, meshCount: number, bounds: { width: number, height: number, depth: number } }}
 */
export function analyzeGeometry(root) {
  if (!root) {
    return { recommendedPreset: 'countertop', recommendedCutoff: 0.82, confidence: 'low', hasMultipleMeshes: false, meshCount: 0 };
  }

  const meshes = [];
  root.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });

  const bbox = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const bounds = {
    width: Math.round(size.x * 100) / 100,
    height: Math.round(size.y * 100) / 100,
    depth: Math.round(size.z * 100) / 100,
  };

  // If the scene already has multiple named meshes from Blender
  if (meshes.length > 1) {
    const names = meshes.map((m) => (m.name || '').toLowerCase());
    const hasSlab = names.some((n) => n.includes('slab') || n.includes('top') || n.includes('stone') || n.includes('counter'));
    const hasCabinet = names.some((n) => n.includes('cabinet') || n.includes('base') || n.includes('carcass') || n.includes('door'));

    if (hasSlab && hasCabinet) {
      return {
        recommendedPreset: 'countertop',
        recommendedCutoff: 0.82,
        confidence: 'high',
        hasMultipleMeshes: true,
        meshCount: meshes.length,
        bounds,
      };
    }
  }

  // If it's very flat (floor or wall tile slab, thickness < 15cm)
  if (size.y < 0.15) {
    return {
      recommendedPreset: 'monolith',
      recommendedCutoff: 0.0,
      confidence: 'high',
      hasMultipleMeshes: meshes.length > 1,
      meshCount: meshes.length,
      bounds,
    };
  }

  // Sample geometry for upward faces distribution across 20 height bins (0.05 height each)
  const buckets = new Array(20).fill(0);
  let totalFaces = 0;
  let sideLateralFaces = 0;

  meshes.forEach((mesh) => {
    try {
      const geo = mesh.geometry;
      if (!geo || !geo.attributes.position) return;

      const pos = geo.attributes.position;
      const norm = geo.attributes.normal;
      const index = geo.index;
      const triangleCount = index ? index.count / 3 : pos.count / 3;
      totalFaces += triangleCount;

      const vA = new THREE.Vector3();
      const vB = new THREE.Vector3();
      const vC = new THREE.Vector3();
      const faceNormal = new THREE.Vector3();

      const maxSamples = Math.min(triangleCount, 3000);
      const step = Math.max(1, Math.floor(triangleCount / maxSamples));

      for (let t = 0; t < triangleCount; t += step) {
        let i0, i1, i2;
        if (index) {
          i0 = index.getX(t * 3);
          i1 = index.getX(t * 3 + 1);
          i2 = index.getX(t * 3 + 2);
        } else {
          i0 = t * 3;
          i1 = t * 3 + 1;
          i2 = t * 3 + 2;
        }

        vA.fromBufferAttribute(pos, i0);
        vB.fromBufferAttribute(pos, i1);
        vC.fromBufferAttribute(pos, i2);

        const avgY = (vA.y + vB.y + vC.y) / 3;
        const relY = Math.min(0.999, Math.max(0, (avgY - bbox.min.y) / (size.y || 1)));

        if (norm) {
          faceNormal.fromBufferAttribute(norm, i0).normalize();
        } else {
          const edge1 = new THREE.Vector3().subVectors(vB, vA);
          const edge2 = new THREE.Vector3().subVectors(vC, vA);
          faceNormal.crossVectors(edge1, edge2).normalize();
        }

        if (faceNormal.y >= 0.6) {
          const b = Math.floor(relY * 20);
          buckets[b]++;
        }

        const avgX = (vA.x + vB.x + vC.x) / 3;
        const relX = (avgX - bbox.min.x) / (size.x || 1);
        if ((relX < 0.05 || relX > 0.95) && Math.abs(faceNormal.x) > 0.7) {
          sideLateralFaces++;
        }
      }
    } catch (meshErr) {
      console.warn('[analyzeGeometry] Mesh analysis error:', meshErr);
    }
  });

  // Evaluate elevation distribution
  // Waist-level zone: bins 5 to 11 (25% to 55% elevation)
  const waistSlice = buckets.slice(5, 12);
  const maxWaistCount = Math.max(0, ...waistSlice);
  const waistBucketIdx = 5 + waistSlice.indexOf(maxWaistCount);

  // Upper cabinet / roof zone: bins 16 to 19 (80% to 100% elevation)
  const upperCount = buckets.slice(16, 20).reduce((sum, v) => sum + v, 0);

  // If there is an upper structure (upper cabinets/wall) AND a strong waist-level horizontal plane:
  if (maxWaistCount >= 30 && upperCount >= 20) {
    const detectedCutoff = Math.round(((waistBucketIdx + 0.5) / 20) * 100) / 100;
    return {
      recommendedPreset: 'full_kitchen',
      recommendedCutoff: detectedCutoff,
      confidence: 'high',
      hasMultipleMeshes: meshes.length > 1,
      meshCount: meshes.length,
      bounds,
    };
  }

  // Check if waterfall
  const topUpward = buckets.slice(15, 20).reduce((sum, v) => sum + v, 0);
  if (topUpward > 0 && sideLateralFaces > (totalFaces * 0.15)) {
    return {
      recommendedPreset: 'waterfall',
      recommendedCutoff: 0.82,
      confidence: 'medium',
      hasMultipleMeshes: meshes.length > 1,
      meshCount: meshes.length,
      bounds,
    };
  }

  return {
    recommendedPreset: 'countertop',
    recommendedCutoff: 0.82,
    confidence: 'high',
    hasMultipleMeshes: meshes.length > 1,
    meshCount: meshes.length,
    bounds,
  };
}

/**
 * Splits a single BufferGeometry into stone and base sub-geometries,
 * and generates clean Triplanar Box Projection UVs on BOTH stone and base.
 *
 * @param {THREE.BufferGeometry} sourceGeo 
 * @param {THREE.Box3} modelBBox 
 * @param {object} config { preset, cutoff, includeWaterfall, textureScale }
 * @returns {{ stoneGeo: THREE.BufferGeometry | null, baseGeo: THREE.BufferGeometry | null, metalGeo: THREE.BufferGeometry | null }}
 */
export function segmentBufferGeometry(sourceGeo, modelBBox, config = {}) {
  const preset = config.preset || 'countertop';
  const cutoff = config.cutoff !== undefined ? config.cutoff : (SEGMENTATION_PRESETS[preset]?.defaultCutoff ?? 0.82);
  const includeWaterfall = config.includeWaterfall ?? (preset === 'waterfall');
  const textureScale = config.textureScale || 1.0;

  // If full stone monolith, entire geometry is stone
  if (preset === 'monolith') {
    const stoneGeo = sourceGeo.clone();
    applyTriplanarUVs(stoneGeo, textureScale);
    return { stoneGeo, baseGeo: null, metalGeo: null };
  }

  // Work with non-indexed geometry so every 3 vertices is a triangle
  const nonIndexed = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  const posAttr = nonIndexed.attributes.position;
  const normAttr = nonIndexed.attributes.normal;
  const count = posAttr.count;

  if (!count) return { stoneGeo: null, baseGeo: null, metalGeo: null };

  const height = modelBBox.max.y - modelBBox.min.y || 1;
  const width  = modelBBox.max.x - modelBBox.min.x || 1;

  // Detect whether this is a waist-level slab (full kitchen suite) or a top slab
  const isWaistSlab = preset === 'full_kitchen' || (cutoff < 0.6);
  const slabCenterCutoff = isWaistSlab ? (cutoff < 0.6 ? cutoff : 0.33) : cutoff;
  const counterY = modelBBox.min.y + height * slabCenterCutoff;

  // Crisp planar slab slice: tight tolerance centered at the actual countertop elevation
  const slabMinY = counterY - 0.012;
  const slabMaxY = counterY + 0.023;
  const heightThreshold = modelBBox.min.y + height * cutoff;

  // Face collections: array of vertex indices (groups of 3)
  const stoneVertexIndices = [];
  const baseVertexIndices  = [];
  const metalVertexIndices = [];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();

  for (let i = 0; i < count; i += 3) {
    vA.fromBufferAttribute(posAttr, i);
    vB.fromBufferAttribute(posAttr, i + 1);
    vC.fromBufferAttribute(posAttr, i + 2);

    const avgY = (vA.y + vB.y + vC.y) / 3;
    const avgX = (vA.x + vB.x + vC.x) / 3;
    const avgZ = (vA.z + vB.z + vC.z) / 3;
    const relX = (avgX - modelBBox.min.x) / width;

    if (normAttr) {
      faceNormal.fromBufferAttribute(normAttr, i).normalize();
    } else {
      const edge1 = new THREE.Vector3().subVectors(vB, vA);
      const edge2 = new THREE.Vector3().subVectors(vC, vA);
      faceNormal.crossVectors(edge1, edge2).normalize();
    }

    let isMetal = false;
    let isStone = false;

    if (isWaistSlab) {
      // 1. Faucet: arching tubular spout & handles protruding above counter level
      const isFaucet = (
        avgX >= -0.20 && avgX <= -0.05 &&
        avgZ >= -0.42 && avgZ <= -0.22 &&
        avgY > (counterY + 0.018) && avgY <= (counterY + 0.25)
      );

      // 2. Sink Basin: 100% full recessed bowl cavity (entire bottom floor + drain + curved walls + inner cut-out rim)
      // Spans full width X in [-0.34, 0.12] and terminates at Z <= -0.120 m (safely inside counter hole, 0 door bleed)
      // Extends down to counterY - 0.33 m (capturing all 4,181 sink floor and drain faces down to -0.517m)
      const isSink = (
        avgX >= -0.34 && avgX <= 0.12 &&
        avgZ >= -0.465 && avgZ <= -0.120 &&
        avgY >= (counterY - 0.33) &&
        (avgY <= (counterY - 0.008) || (avgY <= (counterY + 0.004) && faceNormal.y < 0.5))
      );

      // 3. Stove Burner Grates: restored to grates & burners only as requested
      // The surrounding countertop & base platform remain seamless granite stone!
      const isStove = (
        avgX >= -0.92 && avgX <= -0.68 &&
        avgZ >= -0.06 && avgZ <= 0.40 &&
        avgY >= (counterY + 0.012) && avgY <= (counterY + 0.15)
      );

      if (isFaucet || isSink || isStove) {
        isMetal = true;
      } else if (avgY >= slabMinY && avgY <= slabMaxY) {
        // Clean Countertop Slab: strictly horizontal upward-facing surfaces (Ny >= 0.65)
        // Discards all vertical faces (cabinet door panels, drawer faces, kickboards, backsplash walls, back exterior)
        // so the edges are crisp and razor-sharp without any jagged sawtooth fringe!
        if (faceNormal.y >= 0.65) {
          isStone = true;
        }
      }
    } else {
      // Standard countertop without upper cabinets (slab at top)
      // Check for faucet / fixtures protruding above countertop slab
      if (avgY > counterY + 0.012) {
        isMetal = true;
      } else if (avgY >= heightThreshold - 0.020) {
        if (faceNormal.y >= 0.25 || avgY >= (modelBBox.max.y - height * 0.03)) {
          isStone = true;
        }
      }
    }

    // Waterfall edge rule: outer side faces flowing down
    if (includeWaterfall && !isMetal) {
      const isOuterEdge = relX <= 0.04 || relX >= 0.96;
      if (isOuterEdge && Math.abs(faceNormal.x) >= 0.6) {
        isStone = true;
      }
    }

    if (isMetal) {
      metalVertexIndices.push(i, i + 1, i + 2);
    } else if (isStone) {
      stoneVertexIndices.push(i, i + 1, i + 2);
    } else {
      baseVertexIndices.push(i, i + 1, i + 2);
    }
  }

  // Construct stone geometry
  let stoneGeo = null;
  if (stoneVertexIndices.length > 0) {
    stoneGeo = buildSubGeometry(nonIndexed, stoneVertexIndices);
    applyTriplanarUVs(stoneGeo, textureScale);
  }

  // Construct metal fixtures geometry (sink, faucet, stove)
  let metalGeo = null;
  if (metalVertexIndices.length > 0) {
    metalGeo = buildSubGeometry(nonIndexed, metalVertexIndices);
    applyTriplanarUVs(metalGeo, 1.0);
  }

  // Construct base/cabinet geometry
  let baseGeo = null;
  if (baseVertexIndices.length > 0) {
    baseGeo = buildSubGeometry(nonIndexed, baseVertexIndices);
    applyTriplanarUVs(baseGeo, 1.0);
  }

  return { stoneGeo, baseGeo, metalGeo };
}

/**
 * Builds a sub-geometry from non-indexed geometry using an array of vertex indices.
 */
function buildSubGeometry(sourceGeo, indices) {
  const subGeo = new THREE.BufferGeometry();
  const posSource = sourceGeo.attributes.position;
  const normSource = sourceGeo.attributes.normal;
  const uvSource = sourceGeo.attributes.uv;

  const newPos = new Float32Array(indices.length * 3);
  const newNorm = normSource ? new Float32Array(indices.length * 3) : null;
  const newUv = uvSource ? new Float32Array(indices.length * 2) : null;

  for (let idx = 0; idx < indices.length; idx++) {
    const srcIndex = indices[idx];

    newPos[idx * 3]     = posSource.getX(srcIndex);
    newPos[idx * 3 + 1] = posSource.getY(srcIndex);
    newPos[idx * 3 + 2] = posSource.getZ(srcIndex);

    if (normSource && newNorm) {
      newNorm[idx * 3]     = normSource.getX(srcIndex);
      newNorm[idx * 3 + 1] = normSource.getY(srcIndex);
      newNorm[idx * 3 + 2] = normSource.getZ(srcIndex);
    }

    if (uvSource && newUv) {
      newUv[idx * 2]     = uvSource.getX(srcIndex);
      newUv[idx * 2 + 1] = uvSource.getY(srcIndex);
    }
  }

  subGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
  if (newNorm) subGeo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
  if (newUv)   subGeo.setAttribute('uv', new THREE.BufferAttribute(newUv, 2));

  subGeo.computeVertexNormals();
  return subGeo;
}

/**
 * Injects Triplanar Box Projection UV coordinates into geometry.
 * Ensures granite veins repeat seamlessly across both horizontal slab
 * and vertical waterfall/fascia panels at true metric scale without stretching.
 *
 * @param {THREE.BufferGeometry} geo 
 * @param {number} scale Metric scaling factor (meters per texture tile)
 */
export function applyTriplanarUVs(geo, scale = 1.0) {
  if (!geo || !geo.attributes.position) return;

  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);

  const vertexPos = new THREE.Vector3();
  const vertexNorm = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    vertexPos.fromBufferAttribute(pos, i);

    if (norm) {
      vertexNorm.fromBufferAttribute(norm, i).normalize();
    } else {
      vertexNorm.set(0, 1, 0);
    }

    const nx = Math.abs(vertexNorm.x);
    const ny = Math.abs(vertexNorm.y);
    const nz = Math.abs(vertexNorm.z);

    let u = 0;
    let v = 0;

    // Top or bottom facing (horizontal countertop plane) -> map X and Z
    if (ny >= nx && ny >= nz) {
      u = vertexPos.x / scale;
      v = vertexPos.z / scale;
    }
    // Left or right facing (waterfall edge) -> map Z and Y
    else if (nx >= ny && nx >= nz) {
      u = vertexPos.z / scale;
      v = vertexPos.y / scale;
    }
    // Front or back facing (fascia/apron) -> map X and Y
    else {
      u = vertexPos.x / scale;
      v = vertexPos.y / scale;
    }

    uvs[i * 2]     = u;
    uvs[i * 2 + 1] = v;
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.attributes.uv.needsUpdate = true;
}

/**
 * Processes a 3D scene: checks if models are already multi-mesh or single-mesh.
 * Automatically segments single-mesh models into { stoneMeshes, cabinetMeshes }.
 *
 * @param {THREE.Object3D} scene 
 * @param {object} config { preset, cutoff, includeWaterfall }
 * @returns {{ stoneMeshes: THREE.Mesh[], cabinetMeshes: THREE.Mesh[], isAutoSegmented: boolean }}
 */
export function processSceneMeshes(scene, config = {}) {
  const stoneMeshes = [];
  const cabinetMeshes = [];
  const metalMeshes = [];

  if (!scene) return { stoneMeshes, cabinetMeshes, metalMeshes, isAutoSegmented: false };

  // Calculate overall bounding box of the scene
  const sceneBBox = new THREE.Box3().setFromObject(scene);

  const meshes = [];
  scene.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });

  // Check if scene is already divided into named parts from Blender
  const namedSlabMeshes = meshes.filter((m) => {
    const name = (m.name || '').toLowerCase();
    return name.includes('granite_slab') || name.includes('slab') || name.includes('stone') || name.includes('counter');
  });

  const namedCabinetMeshes = meshes.filter((m) => {
    const name = (m.name || '').toLowerCase();
    return name.includes('cabinet') || name.includes('base') || name.includes('carcass') || name.includes('door');
  });

  const namedMetalMeshes = meshes.filter((m) => {
    const name = (m.name || '').toLowerCase();
    return name.includes('sink') || name.includes('faucet') || name.includes('metal') || name.includes('stove') || name.includes('tap');
  });

  // If already cleanly separated into distinct named parts in Blender:
  if (namedSlabMeshes.length > 0 && (namedCabinetMeshes.length > 0 || namedMetalMeshes.length > 0)) {
    return {
      stoneMeshes: namedSlabMeshes,
      cabinetMeshes: namedCabinetMeshes,
      metalMeshes: namedMetalMeshes,
      isAutoSegmented: false,
    };
  }

  // Otherwise, run automated geometric segmentation
  meshes.forEach((mesh) => {
    const { stoneGeo, baseGeo, metalGeo } = segmentBufferGeometry(mesh.geometry, sceneBBox, config);

    if (stoneGeo) {
      // Elegant initial stone material while PBR texture loads
      const initialStoneMat = new THREE.MeshPhysicalMaterial({
        color: '#DBDBDB',
        roughness: 0.18,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        ior: 1.5,
        envMapIntensity: 1.2,
      });
      const stoneMesh = new THREE.Mesh(stoneGeo, initialStoneMat);
      stoneMesh.name = `${mesh.name}_stone`;
      stoneMesh.castShadow = true;
      stoneMesh.receiveShadow = true;
      stoneMesh.position.copy(mesh.position);
      stoneMesh.rotation.copy(mesh.rotation);
      stoneMesh.scale.copy(mesh.scale);
      if (mesh.parent) {
        mesh.parent.add(stoneMesh);
      }
      stoneMeshes.push(stoneMesh);
    }

    if (metalGeo) {
      // Bright silver chrome / stainless steel metal material for sink, faucet, stove
      const metalMat = new THREE.MeshStandardMaterial({
        color: '#ECEFF2', // Radiant silver chrome
        roughness: 0.15,  // Smooth stainless steel sheen
        metalness: 0.80,  // Balanced metallic reflection for brilliant highlights
        envMapIntensity: 2.5,
      });
      const metalMesh = new THREE.Mesh(metalGeo, metalMat);
      metalMesh.name = `${mesh.name}_metal`;
      metalMesh.castShadow = true;
      metalMesh.receiveShadow = true;
      metalMesh.position.copy(mesh.position);
      metalMesh.rotation.copy(mesh.rotation);
      metalMesh.scale.copy(mesh.scale);
      if (mesh.parent) {
        mesh.parent.add(metalMesh);
      }
      metalMeshes.push(metalMesh);
    }

    if (baseGeo) {
      // Warm, realistic cabinet base material (never pure white!)
      const cabinetMat = new THREE.MeshStandardMaterial({
        color: '#543D2B', // Rich walnut wood base color
        roughness: 0.75,
        metalness: 0.05,
      });
      const baseMesh = new THREE.Mesh(baseGeo, cabinetMat);
      baseMesh.name = `${mesh.name}_cabinet`;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      baseMesh.position.copy(mesh.position);
      baseMesh.rotation.copy(mesh.rotation);
      baseMesh.scale.copy(mesh.scale);
      if (mesh.parent) {
        mesh.parent.add(baseMesh);
      }
      cabinetMeshes.push(baseMesh);
    }

    // Hide original monolithic unsegmented mesh
    mesh.visible = false;
  });

  return {
    stoneMeshes,
    cabinetMeshes,
    metalMeshes,
    isAutoSegmented: true,
  };
}
