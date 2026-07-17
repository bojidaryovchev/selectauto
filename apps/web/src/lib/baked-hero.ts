/**
 * Loader for the precomputed hero point clouds produced by
 * `scripts/bake-hero-points.mjs`. The homepage particle hero used to fetch each
 * ~5-15MB car GLB and, on the main thread, fully parse it (decoding 31 unused
 * PNG textures + building BufferGeometry for ~223k vertices) and then run
 * collectTriangles + sampleSurfacePoints (~1.07M short-lived JS objects for
 * coupe alone). That pipeline could exhaust iOS Safari's per-tab memory ceiling
 * and make GLTFLoader reject -> the "3D ERROR" banner. The sampled output is
 * identical on every visit, so it is baked to
 * `public/models/hero/<model>.<tier>.bin` and just fetched + decoded here — no
 * GLB, no sampler at runtime.
 *
 * Binary layout (little-endian) — must match serialize() in the bake script:
 *   magic   : uint32  = 0x50485054 ("PHPT")
 *   version : uint32  = 1
 *   count   : uint32  = particle count (floats = count * 3)
 *   points  : float32[count * 3]
 */

const MAGIC = 0x50485054;
const VERSION = 1;

/** Layout tier — must match the PARTICLE_COUNT breakpoints in particle-hero.tsx. */
export type HeroTier = "mobile" | "tablet" | "desktop";

/** Map a model URL like "/models/coupe.glb" to its bake basename ("coupe"). */
function modelKey(modelUrl: string): string {
  return modelUrl.split("/").pop()!.replace(/\.glb$/i, "");
}

function decode(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== MAGIC) throw new Error("baked-hero: bad magic");
  const version = view.getUint32(4, true);
  if (version !== VERSION) throw new Error(`baked-hero: unsupported version ${version}`);
  const count = view.getUint32(8, true);
  // Header is 12 bytes (three uint32) -> a multiple of 4, so the Float32Array can
  // view directly into the fetched buffer with no copy.
  return new Float32Array(buffer, 12, count * 3);
}

/**
 * Fetch + decode the baked point cloud for a model at the given tier. Rejects on
 * failure (missing file, bad data); the hero has no GLB fallback anymore, so the
 * caller surfaces the error instead.
 */
export async function loadHeroPoints(
  modelUrl: string,
  tier: HeroTier,
): Promise<Float32Array> {
  const url = `/models/hero/${modelKey(modelUrl)}.${tier}.bin`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baked-hero: ${url} -> ${res.status}`);
  return decode(await res.arrayBuffer());
}
