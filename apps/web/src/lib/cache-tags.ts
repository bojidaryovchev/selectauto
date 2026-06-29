/**
 * Cache-tag constants for the app's `"use cache"` data.
 *
 * Only the homepage queries are app-cached today, all with no per-request key and
 * shared across all visitors:
 *   - `getBuyNowCars` / `getAuctionCars` → `cacheLife("hours")` (tags
 *     `buyNowCars` / `auctionCars`); track the hourly ingestion sync.
 *   - `getCarBrands` → `cacheLife("days")` (tag `cars`); tracks the daily
 *     reference sync, and caching it is what lets the homepage prerender (it
 *     renders outside a Suspense boundary — see its docstring).
 * The catalog queries (page/count/facets/detail) are deliberately NOT cached:
 * they're already DB-cheap (keyset reads, and the counts/facets summary tables —
 * migrations 0016/0017 — answer in ~40ms), their cache keys are per-request-unique
 * (filters × cursor) so a cache would hit near-zero, and the catalog route is
 * dynamic anyway (reads searchParams). See the Next caching docs in
 * node_modules/next/dist/docs (use-cache, use-cache-remote).
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
