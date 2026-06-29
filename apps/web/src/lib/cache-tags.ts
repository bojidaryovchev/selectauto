/**
 * Cache-tag constants for the app's `"use cache"` data.
 *
 * Only the homepage listing queries (`getBuyNowCars` / `getAuctionCars`) are
 * app-cached today — they take no per-request key, are shared across all visitors,
 * and change only as slowly as the hourly ingestion sync. The catalog queries
 * (page/count/facets/detail) are deliberately NOT cached: they're already
 * DB-cheap (keyset reads, and the counts/facets summary tables — migrations
 * 0016/0017 — answer in ~40ms), and their cache keys are per-request-unique
 * (filters × cursor) so a cache in front of them would hit near-zero. See the Next
 * caching docs in node_modules/next/dist/docs (use-cache, use-cache-remote).
 *
 * Invalidation today is purely TTL-based: the homepage queries set
 * `cacheLife("hours")`, and ingestion runs hourly, so the cache naturally tracks
 * the data within ~an hour with no hook. There is intentionally NO `revalidateTag`
 * call wired anywhere — listings change only via the separate ingestion Lambdas,
 * which write straight to Neon and never run Next code, so they can't (and don't
 * need to) call into Next's cache. These tags exist so that IF a Next-side
 * mutation or an ingestion→site webhook is ever added, it can expire the homepage
 * immediately via `revalidateTag(CACHE_TAGS.buyNowCars)` instead of waiting out
 * the TTL.
 *
 * NOTE on persistence: the homepage queries use plain `"use cache"` (in-memory
 * LRU per server instance), NOT `"use cache: remote"`. On Vercel serverless that
 * means each warm instance keeps its own copy for the `cacheLife` window — good
 * enough for slow-changing, shared homepage data. A durable cross-instance cache
 * would require a configured `cacheHandlers.remote` (Redis/KV) — see the
 * use-cache-remote / cacheHandlers docs; intentionally not added (no KV service,
 * and the catalog perf was solved at the DB layer instead).
 */
export const CACHE_TAGS = {
  /** All car listings (both buy-now and auction). */
  cars: "cars",
  /** Buy-now listings shown on the homepage. */
  buyNowCars: "cars-buy-now",
  /** Auction listings shown on the homepage. */
  auctionCars: "cars-auction",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
