/**
 * Precompute the entire per-model geometry for the /proces particle scene so the
 * runtime never loads or parses the GLB at all.
 *
 * `ParticleProcess` (src/components/three/particle-process.tsx) used to, on every
 * page load: fetch + synchronously parse the ~12MB sedan GLB (~1s on the main
 * thread), then run `MeshSurfaceSampler` + two `EdgesGeometry` passes (another
 * ~1.6s). All of that is identical on every visit — the model never changes — so
 * we do it once here and write the finished particle target buffers to
 * `public/models/baked/<model>.<variant>.bin`. The runtime just fetches those
 * small typed arrays; no GLB, no sampler, no EdgesGeometry.
 *
 * Output is a compact little-endian binary blob (NOT JSON — these are hundreds of
 * thousands of floats; binary Float32 keeps each file a few MB, JSON would be
 * 10-20x bigger):
 *
 *   magic       : uint32  = 0x50454448 ("PEDH")
 *   version     : uint32  = 2
 *   targetsLen  : uint32  = floats in the surface-sample targets (particleCount*3)
 *   targets     : float32[targetsLen]
 *   outlineLen  : uint32  = floats in the outline targets (outlineCount*3)
 *   outline     : float32[outlineLen]
 *   lineCnt     : uint32  = number of edge-line meshes
 *   for each line: uint32 len, then float32[len]
 *
 * Run with: `pnpm bake:edges` (from apps/web).
 *
 * IMPORTANT: this MUST mirror, byte-for-byte, the geometry pipeline in
 * particle-process.tsx — particleCount/outlineCount, normalizeScale, the mesh
 * build loop, the surface sampling, and every EdgesGeometry threshold /
 * minEdgeLength / segmentsPerEdge / minMaxDim. If you change any of those there,
 * re-run this script.
 */

// GLTFLoader's texture path references `self`; we never use textures, so a shim
// is enough to let it parse geometry headlessly in Node.
globalThis.self = globalThis;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_MODELS = join(__dirname, "..", "public", "models");
const OUT_DIR = join(PUBLIC_MODELS, "baked");

const MODELS = ["sedan", "coupe", "suv"];

/** Layout variants, each carrying the exact constants particle-process.tsx uses. */
const VARIANTS = [
  { name: "desktop", isMobile: false, particleCount: 18000, outlineCount: 32000 },
  { name: "mobile", isMobile: true, particleCount: 4000, outlineCount: 8000 },
];

function parseGlb(name) {
  const buf = readFileSync(join(PUBLIC_MODELS, `${name}.glb`));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", (gltf) => resolve(gltf), reject);
  });
}

/**
 * Reproduces the mesh list exactly as particle-process.tsx builds it inside the
 * GLTFLoader onLoad callback: clone each mesh geometry, bake its world matrix,
 * recenter on the model bounding box, and normalize-scale it.
 */
function buildMeshes(model, isMobile) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const normalizeScale = (isMobile ? 4.0 : 6.5) / maxSize;

  const meshes = [];
  model.traverse((child) => {
    const mesh = child;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(normalizeScale, normalizeScale, normalizeScale);
    meshes.push(new THREE.Mesh(geometry));
  });
  return meshes;
}

// Mirror of computeMeshSurfaceArea in particle-process.tsx.
function computeMeshSurfaceArea(geometry) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const accumulate = (i0, i1, i2) => {
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);
    area += cross.length() * 0.5;
  };
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      accumulate(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) accumulate(i, i + 1, i + 2);
  }
  return area;
}

/**
 * Surface-sample `particleCount` points, weighted by mesh area — the baked form
 * of the targets loop in the onLoad callback.
 */
function sampleTargets(meshes, samplers, cumulative, totalArea, particleCount) {
  const targets = new Float32Array(particleCount * 3);
  const temp = new THREE.Vector3();
  for (let i = 0; i < particleCount; i++) {
    const r = Math.random() * totalArea;
    let chosen = 0;
    for (let j = 0; j < cumulative.length; j++) {
      if (r < cumulative[j]) { chosen = j; break; }
    }
    samplers[chosen].sample(temp);
    targets[i * 3] = temp.x;
    targets[i * 3 + 1] = temp.y;
    targets[i * 3 + 2] = temp.z;
  }
  return targets;
}

/**
 * Mirror of buildOutlineTargets, baked to the final outlineCount-sized array:
 * edgeBudget edge-biased points (from the EdgesGeometry edge pool) +
 * surfaceBudget area-weighted samples, then tiled to outlineCount.
 */
function buildOutlineTargets(meshes, samplers, cumulative, totalArea, isMobile, outlineCount) {
  const targetCount = isMobile ? 8000 : 36000;
  const edgeBudget = Math.floor(targetCount * 0.65);
  const surfaceBudget = targetCount - edgeBudget;
  const points = [];

  const overallBox = new THREE.Box3();
  meshes.forEach((m) => {
    m.geometry.computeBoundingBox();
    if (m.geometry.boundingBox) overallBox.union(m.geometry.boundingBox);
  });
  const overallSize = overallBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(overallSize.x, overallSize.y, overallSize.z);

  const edgeThreshold = isMobile ? 14 : 1;
  const minEdgeLength = isMobile ? maxDim * 0.018 : 0;
  const segmentsPerEdge = isMobile ? 2 : 4;

  const edgePool = [];
  for (const mesh of meshes) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, edgeThreshold);
    const position = edges.attributes.position;
    if (!position) continue;
    for (let i = 0; i < position.count - 1; i += 2) {
      const ax = position.getX(i), ay = position.getY(i), az = position.getZ(i);
      const bx = position.getX(i + 1), by = position.getY(i + 1), bz = position.getZ(i + 1);
      if (minEdgeLength > 0) {
        const dx = bx - ax, dy = by - ay, dz = bz - az;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < minEdgeLength) continue;
      }
      for (let s = 0; s <= segmentsPerEdge; s++) {
        const tt = s / segmentsPerEdge;
        edgePool.push(new THREE.Vector3(
          ax + (bx - ax) * tt,
          ay + (by - ay) * tt,
          az + (bz - az) * tt,
        ));
      }
    }
  }

  if (edgePool.length > 0) {
    for (let i = 0; i < edgeBudget; i++) {
      points.push(edgePool[Math.floor(Math.random() * edgePool.length)]);
    }
  }

  const temp = new THREE.Vector3();
  for (let i = 0; i < surfaceBudget; i++) {
    const r = Math.random() * totalArea;
    let chosen = 0;
    for (let j = 0; j < cumulative.length; j++) {
      if (r < cumulative[j]) { chosen = j; break; }
    }
    samplers[chosen].sample(temp);
    points.push(temp.clone());
  }

  const src = points.length ? points : [new THREE.Vector3(0, 0, 0)];
  const outline = new Float32Array(outlineCount * 3);
  for (let i = 0; i < outlineCount; i++) {
    const p = src[i % src.length];
    outline[i * 3] = p.x;
    outline[i * 3 + 1] = p.y;
    outline[i * 3 + 2] = p.z;
  }
  return outline;
}

/**
 * Mirror of buildEdgeLines: one EdgesGeometry position buffer per qualifying mesh
 * (meshes below minMaxDim are skipped). Returned as flat number[] per mesh.
 */
function buildEdgeLines(meshes, isMobile) {
  const minMaxDim = isMobile ? 0.25 : 0.12;
  const edgeThreshold = isMobile ? 22 : 10;
  const lines = [];
  meshes.forEach((mesh) => {
    if (!mesh.geometry?.attributes.position) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return;
    const size = box.getSize(new THREE.Vector3());
    if (Math.max(size.x, size.y, size.z) < minMaxDim) return;
    const edges = new THREE.EdgesGeometry(mesh.geometry, edgeThreshold);
    const position = edges.attributes.position;
    if (!position) return;
    lines.push(Array.from(position.array));
  });
  return lines;
}

const MAGIC = 0x50454448; // "PEDH"
const VERSION = 2;

function serialize(targets, outline, edgeLines) {
  let bytes = 4 + 4 + 4 + targets.length * 4 + 4 + outline.length * 4 + 4;
  for (const line of edgeLines) bytes += 4 + line.length * 4;

  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);
  let o = 0;
  view.setUint32(o, MAGIC, true); o += 4;
  view.setUint32(o, VERSION, true); o += 4;
  view.setUint32(o, targets.length, true); o += 4;
  for (let i = 0; i < targets.length; i++) { view.setFloat32(o, targets[i], true); o += 4; }
  view.setUint32(o, outline.length, true); o += 4;
  for (let i = 0; i < outline.length; i++) { view.setFloat32(o, outline[i], true); o += 4; }
  view.setUint32(o, edgeLines.length, true); o += 4;
  for (const line of edgeLines) {
    view.setUint32(o, line.length, true); o += 4;
    for (let i = 0; i < line.length; i++) { view.setFloat32(o, line[i], true); o += 4; }
  }
  return Buffer.from(buffer);
}

async function bake() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const name of MODELS) {
    const gltf = await parseGlb(name);
    for (const v of VARIANTS) {
      const t0 = performance.now();
      const meshes = buildMeshes(gltf.scene, v.isMobile);

      const areas = meshes.map((m) => computeMeshSurfaceArea(m.geometry));
      const totalArea = areas.reduce((a, b) => a + b, 0);
      const cumulative = [];
      let acc = 0;
      for (const a of areas) { acc += a; cumulative.push(acc); }
      const samplers = meshes.map((m) => new MeshSurfaceSampler(m).build());

      const targets = sampleTargets(meshes, samplers, cumulative, totalArea, v.particleCount);
      const outline = buildOutlineTargets(meshes, samplers, cumulative, totalArea, v.isMobile, v.outlineCount);
      const edgeLines = buildEdgeLines(meshes, v.isMobile);

      const blob = serialize(targets, outline, edgeLines);
      const outPath = join(OUT_DIR, `${name}.${v.name}.bin`);
      writeFileSync(outPath, blob);
      const edgeLinePoints = edgeLines.reduce((a, l) => a + l.length / 3, 0);
      console.log(
        `baked ${name}.${v.name}: ` +
          `targets=${targets.length / 3}, outline=${outline.length / 3}, ` +
          `lines=${edgeLines.length}mesh/${edgeLinePoints}pts, ` +
          `${(blob.length / 1024 / 1024).toFixed(2)}MB, ${(performance.now() - t0).toFixed(0)}ms`,
      );
    }
  }
  console.log(`\nDone -> ${OUT_DIR}`);
}

bake().catch((err) => {
  console.error(err);
  process.exit(1);
});
