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
  // can import the Drizzle schema/types from @auctions-ingestion/db.
  transpilePackages: ["@auctions-ingestion/db"],
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
};

export default nextConfig;
