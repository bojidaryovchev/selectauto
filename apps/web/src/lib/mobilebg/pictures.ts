import "server-only";
import { MAX_PICTURES } from "./client";

/**
 * Photo delivery for mobile.bg.
 *
 * ── Why a proxy route and not a bucket ──────────────────────────────────────
 * mobile.bg does not accept uploads. At account activation you register ONE
 * domain with them, and `advertpicts` then takes bare relative paths
 * (`DSC01.jpg~DSC02.jpg`) which they download from that domain themselves.
 *
 * Our gallery images live on the auction CDNs (`i.auctionsapi.com`, Copart,
 * IAAI), so they cannot be handed over as-is. The repo also has NO public object
 * store to copy them into: the former thumbnail bucket + CloudFront was removed
 * (infra/src/storage.ts says so explicitly — the catalog now serves card images
 * straight from the source CDNs), and the only remaining bucket is the PRIVATE
 * documents one, which has Block Public Access on and no distribution.
 *
 * So the delivery path is a public route on our own domain
 * (`/mobilebg-img/<carId>/<n>.jpg`) that streams the image through. This is the
 * cheapest correct option and has a real advantage over copying: mobile.bg
 * fetches each photo exactly ONCE, at publish time, so there is nothing to store,
 * bake, invalidate or pay for afterwards. The trade-off is that the route must
 * still resolve while they crawl it — which is why publishing verifies every
 * image is reachable and is genuine JPEG BEFORE the advert is created.
 *
 * ── Why the index is frozen into the filename ───────────────────────────────
 * `<n>` is the position in the car's ORIGINAL gallery array, not the position in
 * the filtered list we send. Non-JPEG or unreachable images are dropped from the
 * `picts` list without renumbering the survivors, so the route can always map a
 * filename back to the same source URL.
 */

/** URL prefix of the proxy route. Registered domain + this = what they fetch. */
export const PICTURE_ROUTE_PREFIX = "mobilebg-img";

/** JPEG SOI + marker. mobile.bg accepts only .jpg/.jpeg, so this is enforced. */
function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * `(carId, 0)` → `/mobilebg-img/50290/01.jpg` — the path mobile.bg gets.
 *
 * The LEADING SLASH matches their documented example exactly: registered domain
 * `https://www.mobile.bg/` + picts `/images/test1.jpg` → they download
 * `https://www.mobile.bg/images/test1.jpg`. How they join a path WITHOUT the
 * slash is undocumented, so we send the one form they have shown working.
 */
export function picturePath(carId: number, index: number): string {
  return `/${PICTURE_ROUTE_PREFIX}/${carId}/${String(index + 1).padStart(2, "0")}.jpg`;
}

/** `01.jpg` → 0. Returns null for anything that is not a valid slot name. */
export function indexFromFilename(filename: string): number | null {
  const m = filename.match(/^(\d{1,2})\.jpe?g$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PICTURES) return null;
  return n - 1;
}

export type PreparedPictures = {
  /** Relative paths for `advertpicts`, in gallery order. */
  picts: string[];
  /** Images dropped, with the reason — surfaced in the admin preview. */
  skipped: { index: number; reason: string }[];
};

/**
 * Verify the first `MAX_PICTURES` gallery images and build the `picts` list.
 *
 * Runs BEFORE the advert is created, deliberately: an advert published with
 * photos mobile.bg then fails to download is already billable, and fixing it
 * means a second round of calls. A ranged GET keeps each check to a few bytes
 * (CDNs that ignore `Range` just return more, which is still fine — we only read
 * the head).
 */
export async function preparePictures(
  carId: number,
  images: string[],
): Promise<PreparedPictures> {
  const candidates = images.slice(0, MAX_PICTURES);
  const picts: string[] = [];
  const skipped: { index: number; reason: string }[] = [];

  const checks = await Promise.all(
    candidates.map(async (url, index) => {
      try {
        const res = await fetch(url, { headers: { range: "bytes=0-2" }, cache: "no-store" });
        if (!res.ok && res.status !== 206) return { index, ok: false, reason: `HTTP ${res.status}` };
        const head = new Uint8Array((await res.arrayBuffer()).slice(0, 3));
        if (!isJpeg(head)) return { index, ok: false, reason: "не е JPEG" };
        return { index, ok: true, reason: "" };
      } catch (error) {
        return { index, ok: false, reason: `недостъпна (${String(error)})` };
      }
    }),
  );

  for (const c of checks) {
    if (c.ok) picts.push(picturePath(carId, c.index));
    else skipped.push({ index: c.index, reason: c.reason });
  }

  return { picts, skipped };
}
