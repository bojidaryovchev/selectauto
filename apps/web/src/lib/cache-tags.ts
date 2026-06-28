/**
 * Centralized cache-tag constants for `"use cache"` data (cars listings, etc.),
 * adopted from the ecommerce-store pattern: queries call `cacheTag(...)` and
 * mutations call `revalidateTag(tag, "max")` (the single-arg form is deprecated
 * in Next 16 — see apps/web/AGENTS.md and the docs).
 *
 * NOTE: `cacheTag`/`"use cache"` require `cacheComponents: true` in
 * next.config.ts. That flag is a separate, deliberate opt-in (it also changes
 * rendering to dynamic-by-default + PPR), so these tags are defined here ahead of
 * being wired into the queries. Until then they are unused constants — safe.
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
