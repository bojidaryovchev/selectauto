/**
 * Precompute the point-cloud targets for the homepage particle hero so the
 * runtime never downloads or parses the car GLBs at all.
 *
 * `ParticleHero` (src/components/three/particle-hero.tsx) used to, on every page
 * load, fetch each ~5-15MB GLB (coupe.glb alone is 14.7MB), fully parse it —
 * decoding 31 unused PNG textures and building BufferGeometry for ~223k vertices
 * — and then run `collectTriangles` + `sampleSurfacePoints` on the main thread,
 * materializing ~1.07M short-lived JS objects (266k triangle records × Vector3).
 * On desktop that's merely slow; on iOS Safari's much lower per-tab memory
 * ceiling it could throw during load/sample, which GLTFLoader routes to onError
 * -> the "3D ERROR" banner. The sampled output is identical on every visit (the
 * models never change), so we bake it once here and the runtime just fetches a
 * few-KB Float32 buffer.
 *
 * Output is a compact little-endian binary blob per (model, tier):
 *   magic   : uint32  = 0x50485054 ("PHPT")
 *   version : uint32  = 1
 *   count   : uint32  = particle count (floats = count * 3)
 *   points  : float32[count * 3]   // xyz surface samples, already fit-transformed
 *
 * Run with: `pnpm bake:hero` (from apps/web).
 *
 * IMPORTANT: this MUST mirror, point-for-point, the geometry pipeline that
 * particle-hero.tsx used (fitModel + collectTriangles + sampleSurfacePoints) and
 * the per-tier PARTICLE_COUNT / targetSize constants. If you change any of those
 * in the component, re-run this script.
 */

// GLTFLoader's texture path references `self`; we never use textures, so a shim
// is enough to let it parse geometry headlessly in Node.
globalThis.self = globalThis;

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_MODELS = join(__dirname, "..", "public", "models");
const OUT_DIR = join(PUBLIC_MODELS, "hero");

const MODELS = ["coupe", "sedan", "suv"];

/**
 * Layout tiers, each carrying the exact constants particle-hero.tsx uses.
 * PARTICLE_COUNT: mobile (<=768) 2500, tablet (<=1100) 5000, desktop 8000.
 * targetSize in fitModel: mobile 4.9, otherwise 4.4.
 */
const TIERS = [
  { name: "mobile", particleCount: 2500, targetSize: 4.9 },
  { name: "tablet", particleCount: 5000, targetSize: 4.4 },
  { name: "desktop", particleCount: 8000, targetSize: 4.4 },
];

function parseGlb(name) {
  const buf = readFileSync(join(PUBLIC_MODELS, `${name}.glb`));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", (gltf) => resolve(gltf), reject);
  });
}

/** Mirror of fitModel() in particle-hero.tsx. Mutates the model in place. */
function fitModel(model, targetSize) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxSize = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxSize;
  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.rotation.y = Math.PI / 2;
  model.updateMatrixWorld(true);
  const newBox = new THREE.Box3().setFromObject(model);
  model.position.y -= newBox.min.y;
  model.updateMatrixWorld(true);
}

/** Mirror of collectTriangles() in particle-hero.tsx. */
function collectTriangles(model) {
  const triangles = [];
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    const mesh = child;
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    const pos = mesh.geometry.attributes.position;
    const index = mesh.geometry.index;
    const matrix = mesh.matrixWorld;
    const getVertex = (i) =>
      new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(matrix);
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = getVertex(index.getX(i));
        const b = getVertex(index.getX(i + 1));
        const c = getVertex(index.getX(i + 2));
        const area = new THREE.Triangle(a, b, c).getArea();
        if (area > 0.00001) triangles.push({ a, b, c, area });
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        const a = getVertex(i);
        const b = getVertex(i + 1);
        const c = getVertex(i + 2);
        const area = new THREE.Triangle(a, b, c).getArea();
        if (area > 0.00001) triangles.push({ a, b, c, area });
      }
    }
  });
  return triangles;
}

/** Mirror of sampleSurfacePoints() in particle-hero.tsx. */
function sampleSurfacePoints(model, particleCount) {
  const triangles = collectTriangles(model);
  const cumulative = [];
  let totalArea = 0;
  for (const tri of triangles) {
    totalArea += tri.area;
    cumulative.push(totalArea);
  }
  const pts = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = Math.random() * totalArea;
    let low = 0;
    let high = cumulative.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (cumulative[mid] < r) low = mid + 1;
      else high = mid;
    }
    const tri = triangles[low];
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const point = new THREE.Vector3()
      .copy(tri.a)
      .addScaledVector(new THREE.Vector3().subVectors(tri.b, tri.a), u)
      .addScaledVector(new THREE.Vector3().subVectors(tri.c, tri.a), v);
    const ix = i * 3;
    pts[ix] = point.x;
    pts[ix + 1] = point.y;
    pts[ix + 2] = point.z;
  }
  return pts;
}

const MAGIC = 0x50485054; // "PHPT"
const VERSION = 1;

function serialize(points) {
  const count = points.length / 3;
  const buffer = new ArrayBuffer(12 + points.length * 4);
  const view = new DataView(buffer);
  let o = 0;
  view.setUint32(o, MAGIC, true); o += 4;
  view.setUint32(o, VERSION, true); o += 4;
  view.setUint32(o, count, true); o += 4;
  for (let i = 0; i < points.length; i++) { view.setFloat32(o, points[i], true); o += 4; }
  return Buffer.from(buffer);
}

async function bake() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const name of MODELS) {
    for (const tier of TIERS) {
      const t0 = performance.now();
      // fitModel mutates the scene, so re-parse per tier to keep tiers independent
      // (mobile uses a different targetSize than tablet/desktop).
      const scene = (await parseGlb(name)).scene;
      fitModel(scene, tier.targetSize);
      const points = sampleSurfacePoints(scene, tier.particleCount);
      const blob = serialize(points);
      const outPath = join(OUT_DIR, `${name}.${tier.name}.bin`);
      writeFileSync(outPath, blob);
      console.log(
        `baked ${name}.${tier.name}: points=${points.length / 3}, ` +
          `${(blob.length / 1024).toFixed(1)}KB, ${(performance.now() - t0).toFixed(0)}ms`,
      );
    }
  }
  console.log(`\nDone -> ${OUT_DIR}`);
}

bake().catch((err) => {
  console.error(err);
  process.exit(1);
});
