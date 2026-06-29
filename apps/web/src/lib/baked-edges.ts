/**
 * Loader for the precomputed particle geometry produced by
 * `scripts/bake-particle-edges.mjs`. The /proces particle scene used to fetch +
 * synchronously parse the ~12MB car GLB and then run MeshSurfaceSampler + two
 * EdgesGeometry passes on every load (~2.5s of main-thread work total). All of
 * that output is identical on every visit, so it is baked to
 * `public/models/baked/<model>.<variant>.bin` and just fetched + decoded here —
 * no GLB, no sampler, no EdgesGeometry at runtime.
 *
 * Binary layout (little-endian) — must match serialize() in the bake script:
 *   magic       : uint32  = 0x50454448 ("PEDH")
 *   version     : uint32  = 2
 *   targetsLen  : uint32  = floats in the surface-sample targets (particleCount*3)
 *   targets     : float32[targetsLen]
 *   outlineLen  : uint32  = floats in the outline targets (outlineCount*3)
 *   outline     : float32[outlineLen]
 *   lineCnt     : uint32  = number of edge-line meshes
 *   for each line: uint32 len, then float32[len]
 */

const MAGIC = 0x50454448;
const VERSION = 2;

export type BakedGeometry = {
  /** Surface-sample particle targets, flat xyz (particleCount * 3). */
  targets: Float32Array;
  /** Outline particle targets, flat xyz (outlineCount * 3). */
  outline: Float32Array;
  /** One flat xyz position buffer per edge-line mesh (rendered as LineSegments). */
  edgeLines: Float32Array[];
};

/** Map a model URL like "/models/sedan.glb" to its bake basename ("sedan"). */
function modelKey(modelUrl: string): string {
  return modelUrl.split("/").pop()!.replace(/\.glb$/i, "");
}

function decode(buffer: ArrayBuffer): BakedGeometry {
  const view = new DataView(buffer);
  let o = 0;
  const magic = view.getUint32(o, true); o += 4;
  if (magic !== MAGIC) throw new Error("baked-geometry: bad magic");
  const version = view.getUint32(o, true); o += 4;
  if (version !== VERSION) throw new Error(`baked-geometry: unsupported version ${version}`);

  // Float32Array views need 4-byte alignment; every offset below is a multiple of
  // 4 (the header and each length prefix are uint32), so we can view into the
  // buffer with no copy.
  const targetsLen = view.getUint32(o, true); o += 4;
  const targets = new Float32Array(buffer, o, targetsLen);
  o += targetsLen * 4;

  const outlineLen = view.getUint32(o, true); o += 4;
  const outline = new Float32Array(buffer, o, outlineLen);
  o += outlineLen * 4;

  const lineCnt = view.getUint32(o, true); o += 4;
  const edgeLines: Float32Array[] = [];
  for (let i = 0; i < lineCnt; i++) {
    const len = view.getUint32(o, true); o += 4;
    edgeLines.push(new Float32Array(buffer, o, len));
    o += len * 4;
  }
  return { targets, outline, edgeLines };
}

/**
 * Fetch + decode the baked geometry for a model at the given breakpoint. Rejects
 * on failure (missing file, bad data); the scene has no GLB fallback anymore, so
 * the caller surfaces the error instead.
 */
export async function loadBakedGeometry(
  modelUrl: string,
  isMobile: boolean,
): Promise<BakedGeometry> {
  const variant = isMobile ? "mobile" : "desktop";
  const url = `/models/baked/${modelKey(modelUrl)}.${variant}.bin`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baked-geometry: ${url} -> ${res.status}`);
  return decode(await res.arrayBuffer());
}
