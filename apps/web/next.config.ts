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
  // The payment-notice PDF templates (src/pdf) register their Cyrillic TTFs by
  // filesystem path at runtime — nothing imports the .ttf files, so output
  // tracing would drop them from the serverless bundle. Include them for the
  // routes that render PDFs: the admin contract pages (server actions generate
  // notices there) and the download route.
  outputFileTracingIncludes: {
    "/admin/dogovori/**": ["./src/pdf/fonts/*.ttf", "./src/pdf/assets/*.png"],
    "/api/payment-document/**": ["./src/pdf/fonts/*.ttf", "./src/pdf/assets/*.png"],
  },
  // Proof-of-payment uploads (прикачен платежен документ, contracts module) go
  // through a server action as multipart FormData; the default 1MB body cap is
  // too small for phone photos of payment slips.
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  // next/image now serves ONLY a handful of LOCAL, immutable static assets — the
  // header/footer logo (/logo.png) and the brand-logo grid (/brand-logos/*.png);
  // the inquiry hero is rendered `unoptimized`. Every auction/car photo is served
  // DIRECTLY from its source CDN through a plain <img> (no optimizer), so no
  // remote host needs whitelisting here anymore and the runaway per-car
  // transformation cost that dominated the Vercel bill is gone.
  images: {
    // The logos are immutable, so cache each optimized variant for 31 days
    // rather than Next 16's 4h default — otherwise a continuously-served logo
    // goes STALE and is re-optimized (billed) every 4h for zero benefit.
    minimumCacheTTL: 2678400, // 31 days
    // These logos render small (≤~170px wide, so 1x/2x tops out ~340px). Keep
    // the trimmed width ladders so each logo yields only a couple of variants.
    // (Defaults were deviceSizes [640,750,828,1080,1200,1920,2048,3840] and
    // imageSizes [16,32,48,64,96,128,256,384].)
    deviceSizes: [640, 750, 828, 1080, 1920],
    imageSizes: [96, 128, 256],
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
