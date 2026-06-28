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
  // Cache Components: enables the `"use cache"` directive + `cacheTag`, so the
  // car-listing queries fetch live DB data at request time and cache it by tag
  // (revalidated on writes via `revalidateTag(tag, "max")`), instead of baking
  // the result in at build time. This makes data fetching dynamic-by-default and
  // turns on Partial Prerendering — pages render a static shell with the cached
  // listings streamed in. See RESTRUCTURE-PLAN.md §7 and the Next 16 docs.
  cacheComponents: true,
  // Auction-listing photos are served from the upstream source hosts that
  // AuctionsAPI aggregates (encar, copart, iaai, ironplanet, plus its own CDN).
  // next/image requires each remote host to be whitelisted. These are the
  // distinct hosts currently present in auction_lots.image_url; add new ones
  // here if AuctionsAPI introduces another source.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.auctionsapi.com" },
      { protocol: "https", hostname: "ci.encar.com" },
      { protocol: "https", hostname: "cs.copart.com" },
      { protocol: "https", hostname: "vis.iaai.com" },
      { protocol: "https", hostname: "cdn.ironpla.net" },
      { protocol: "https", hostname: "www-ironplanet.s3-us-west-2.amazonaws.com" },
    ],
  },
};

export default nextConfig;
