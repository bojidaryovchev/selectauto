import { withBotId } from "botid/next/config";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// Load the repo-root .env so server-side secrets shared with the rest of the
// monorepo (NEON_DATABASE_URL, RESEND_API_KEY, CARFAX_NOTIFY_EMAIL) are available
// at build/runtime. Next only auto-loads .env files from the app dir, and these
// live at the workspace root. Mirrors packages/db/drizzle.config.ts. An app-local
// .env (if added later) still wins because Next loads it after this runs.
const rootEnv = resolve(__dirname, "..", "..", ".env");
if (existsSync(rootEnv)) loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  // Compile the shared workspace package (TS source, not pre-built) so the app
  // can import the Drizzle schema/types from @selectauto/db.
  transpilePackages: ["@selectauto/db"],
  // Cache Components (Next 16, stable; the v16 flag that unifies the old
  // experimental ppr/useCache/dynamicIO): data is dynamic-by-default with Partial
  // Prerendering — pages render a static shell and stream request-time data under
  // Suspense. Our caching split (see queries/cars/*):
  //   - HOMEPAGE shared queries (getBuyNowCars/getAuctionCars/getCarBrands) use
  //     the `"use cache"` directive (+ cacheLife/cacheTag) so their output is baked
  //     into the static shell — these have no per-request key and change only as
  //     fast as ingestion. Caching getCarBrands specifically is what lets the
  //     homepage fully prerender (it renders outside any Suspense boundary).
  //   - CATALOG queries (page/count/facets/detail) are NOT cached: they're already
  //     DB-cheap (keyset reads + the counts/facets summary tables, migrations
  //     0016/0017) and their keys are per-request-unique (filters × cursor), and
  //     the catalog route is dynamic anyway (reads searchParams).
  //   - We use plain `"use cache"` (in-memory LRU), NOT `"use cache: remote"`:
  //     without a configured cacheHandlers.remote the two are identical, and on
  //     Vercel serverless the in-memory store is best-effort per instance. A
  //     durable cross-instance cache would need a Redis/KV handler — intentionally
  //     not added (catalog perf was solved at the DB layer). See cache-tags.ts and
  //     node_modules/next/dist/docs (use-cache, use-cache-remote, cacheHandlers).
  cacheComponents: true,
  // Auction-listing photos are served from the upstream source hosts that
  // AuctionsAPI aggregates (encar, copart, iaai, ironplanet, plus its own CDN).
  // next/image requires each remote host to be whitelisted. We use per-source
  // wildcards (`**.` matches the apex + any subdomain depth) so new CDN
  // subdomains a source rolls out don't trigger a runtime "unconfigured host"
  // error. The set was derived by scanning auction_lots.raw_json.images (the
  // gallery source) + the listing tables' image_url against the live DB.
  images: {
    // Auction lot photos are IMMUTABLE once ingested (a lot's images never
    // change). Next 16 defaults `minimumCacheTTL` to 14400s (4h), so a
    // continuously-viewed image goes STALE and is re-optimized every 4h — each
    // STALE hit is billed by Vercel as a transformation + a cache write, for
    // zero benefit. 31 days (Vercel's documented value for "doesn't change in a
    // month") means each optimized variant is billed ~once/month instead. This
    // is the single biggest lever on Image Optimization cost.
    minimumCacheTTL: 2678400, // 31 days
    // Restrict the responsive width ladder to what we actually render. Cards top
    // out at 25vw and the detail-gallery main image at 60vw (≤~1150px on a 1920
    // viewport), so 1920 is the realistic ceiling — 2048/3840 were never served
    // and 1200 is redundant next to 1080/1920. Fewer widths = fewer distinct
    // optimized variants per source image = fewer transformations/cache writes.
    // (Default was [640,750,828,1080,1200,1920,2048,3840].)
    deviceSizes: [640, 750, 828, 1080, 1920],
    // Only the 88px detail-gallery thumbnails use this list (sizes="88px").
    // Trim the default 8-entry ladder to the few sizes those thumbnails hit.
    // (Default was [16,32,48,64,96,128,256,384].)
    imageSizes: [96, 128, 256],
    // Next 16 defaults `qualities` to `[75]` and rejects any other `quality`
    // prop (coercing it to the nearest allowed value). The dense thumbnail grid
    // on /vsichki-avtomobili uses q=60 (smaller bytes, no visible loss at card
    // size); 75 stays for everything else. Allowlist both.
    qualities: [60, 75],
    remotePatterns: [
      { protocol: "https", hostname: "**.auctionsapi.com" }, // AuctionsAPI CDN
      { protocol: "https", hostname: "**.encar.com" }, // Encar (Korea): ci., imgcar.
      { protocol: "https", hostname: "**.copart.com" }, // Copart: cs., c-static.
      { protocol: "https", hostname: "**.iaai.com" }, // IAAI: vis., mediaretriever.
      { protocol: "https", hostname: "**.ironpla.net" }, // IronPlanet
      // IAAI also serves media off Azure (media-retriever-prd-cus) + a one-off
      // blob storage host; CloudFront serves the odd long-tail copy. These are
      // generic provider domains, so scope the wildcard to the exact subdomain
      // tree we've observed rather than the whole provider.
      { protocol: "https", hostname: "**.azurewebsites.net" },
      { protocol: "https", hostname: "**.blob.core.windows.net" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "www-ironplanet.s3-us-west-2.amazonaws.com" },
    ],
  },
  // Baseline security headers on every route. Deliberately CONSERVATIVE — the
  // broadly-safe set that won't break anything here:
  //   - X-Content-Type-Options: nosniff — stop MIME-sniffing.
  //   - Referrer-Policy: strict-origin-when-cross-origin — send origin only
  //     cross-site (the modern default; also what the contacts map iframe uses).
  //   - X-Frame-Options: SAMEORIGIN — we embed a Google Map *in* our page (fine);
  //     this only stops OTHERS from framing us (clickjacking).
  //   - Strict-Transport-Security — force HTTPS (prod is HTTPS-only).
  //   - Permissions-Policy — disable powerful APIs we don't use.
  // NOT setting a Content-Security-Policy here: a correct CSP must allowlist the
  // WebGL/three assets, next/image remote auction hosts, the Google Maps embed,
  // Resend, and Auth.js endpoints — easy to get wrong and silently break the app.
  // That's a deliberate, separately-tested follow-up, not a Phase-0 one-liner.
  // Recover visitors landing on URL shapes this site has never had. Speed
  // Insights showed real users hitting `/car/{year-make-model-…}` (another
  // site's / an AI-invented detail-URL format) and getting the 404 page; our
  // detail pages live at `/avtomobil/[id]`. Send them to the catalog instead.
  // Non-permanent (307) on purpose: nothing should be indexed under `/car/`,
  // and if we later resolve these slugs to real listings we don't want the
  // blunt catalog redirect cached in browsers/CDNs.
  async redirects() {
    return [
      {
        source: "/car/:slug*",
        destination: "/vsichki-avtomobili",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

// Wrap with BotID (Vercel Bot Management). `withBotId` injects the proxy rewrites
// that serve the invisible-CAPTCHA challenge from a first-party path (under a
// `/149e9513-…` prefix), so ad-blockers/third-party-script blockers can't defeat
// it. The client challenge itself is registered in `src/instrumentation-client.ts`
// (initBotId), and the protected routes call `checkBotId()` server-side. Basic
// mode is enabled in the Vercel dashboard (free); `checkBotId()` incurs no charge
// unless Deep Analysis is turned on. See docs/botid.
export default withBotId(nextConfig);
