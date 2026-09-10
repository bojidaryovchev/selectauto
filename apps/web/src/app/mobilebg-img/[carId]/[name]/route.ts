import { NextResponse } from "next/server";
import { indexFromFilename } from "@/lib/mobilebg/pictures";
import { getCarGallery } from "@/queries/mobilebg/get-car-gallery.query";

/**
 * `/mobilebg-img/<carId>/<nn>.jpg` — the photo endpoint mobile.bg downloads from.
 *
 * mobile.bg accepts no uploads: at account activation you register one domain,
 * and `advertpicts` then takes bare relative paths they fetch themselves. Our
 * gallery lives on the auction CDNs and the repo has no public bucket to copy it
 * into (see lib/mobilebg/pictures.ts for the full reasoning), so this route IS
 * the delivery mechanism.
 *
 * ── This is not an open proxy ───────────────────────────────────────────────
 * The upstream URL is never taken from the request. It is resolved from the
 * car's own stored gallery by INDEX, so the only thing a caller can influence is
 * which of that car's existing photos they get — all of which are already public
 * on `/avtomobil/<carId>`. A paid de-index still 404s here, because a car we
 * were paid to hide must not stay reachable through a side door.
 *
 * PUBLIC by necessity — mobile.bg's fetcher is anonymous. The `.jpg` suffix also
 * keeps it outside the proxy matcher (proxy.ts excludes static extensions), so
 * no auth or 410 middleware runs on the hot path.
 */

/** Upstream fetch budget. Their crawler will not wait forever, and neither do we. */
const UPSTREAM_TIMEOUT_MS = 10_000;

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ carId: string; name: string }> },
) {
  const { carId: rawCarId, name } = await ctx.params;

  const carId = Number(rawCarId);
  const index = indexFromFilename(name);
  if (!Number.isInteger(carId) || carId <= 0 || index === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  const gallery = await getCarGallery(carId);
  if (!gallery || gallery.deindexed) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = gallery.images[index];
  if (!url) return new NextResponse("Not found", { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[mobilebg-img] upstream fetch failed", carId, index, error);
    return new NextResponse("Bad gateway", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Bad gateway", { status: 502 });
  }

  // Always announce JPEG: mobile.bg accepts only .jpg/.jpeg, and `preparePictures`
  // has already verified these bytes really are JPEG before the advert was made.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "image/jpeg",
      // They fetch each photo once, but a retry within the window should not
      // re-hit the auction CDN.
      "cache-control": "public, max-age=86400",
    },
  });
}
