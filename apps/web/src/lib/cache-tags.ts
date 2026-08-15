/**
 * Cache-tag constants for the app's `"use cache"` data.
 *
 * App-cached (`"use cache"`) reads and their tags — all shared across visitors:
 *   - `getBuyNowCars` / `getAuctionCars` → `cacheLife("hours")` (tags
 *     `buyNowCars` / `auctionCars`); track the hourly ingestion sync.
 *   - The reference + make/model-hub reads → `cacheLife("days")` (tag `cars`):
 *     `getCarBrands` (caching it is what lets the homepage prerender — it renders
 *     outside a Suspense boundary), the hub resolvers (`resolveCarHub` /
 *     `resolveBrandHub` / `getBrandModelHubs`), the per-model hub aggregates
 *     (`getModelHubStats` / `getModelSoldPricesByYear` / `getModelYearSoldStat`),
 *     and the sitemap hub/listing queries. Each takes a small, stable key (make/
 *     model ids) and tracks the daily reference/summary sync.
 * The catalog FEED queries (page/count) are deliberately NOT `"use cache"`: their
 * keys are per-request-unique (filters × cursor) so an app cache would hit
 * near-zero, and they're already DB-cheap (keyset reads + the counts/facets summary
 * tables, migrations 0016/0017, ~40ms). Three runtime reads use `"use cache: remote"`
 * instead — the Vercel Runtime Cache, shared across instances in the region; the
 * handler is provided automatically under `cacheComponents`, billed in 8 KB units
 * at ~$0.52/M read units + $5.20/M WRITE units in fra1, within the Pro credit:
 *   - `getCarDetail` (per-carId key, `cacheLife("hours")`, tag `cars` + `car-{id}`):
 *     the ~945k crawler-hammered detail pages each cost a multi-round-trip Neon
 *     read; a SHARED per-id store fits where the per-instance LRU couldn't. Hourly
 *     staleness is free — listings only change via the hourly ingestion sync.
 *   - `getRelatedPool` (per-model / per-brand key, `cacheLife("hours")`, tag
 *     `cars`): the detail page's "Подобни автомобили" carousel. Split OUT of the
 *     per-car entry above precisely because it does NOT vary per car — see below.
 *   - `computeCarFacets` (no key — one entry, `cacheLife("hours")`, tag `cars`):
 *     the global filter-dropdown base, 9 summary reads otherwise re-run per
 *     catalog request.
 *
 * ⚠️ The Runtime Cache is NOT durable: Vercel's docs call it ephemeral, with a
 * fixed per-project storage limit and LRU eviction. WRITES cost 10× reads, so an
 * entry that is evicted before it is read back is pure loss — and a key space far
 * larger than the cache is a treadmill of writes that are never read. Cardinality
 * is therefore the design constraint: prefer the SMALLEST key that still gives a
 * correct answer, and keep per-key payloads lean, because every KB in a 945k-key
 * entry is multiplied by 945k. Read/write unit counts and the hit rate are visible
 * under Observability → Runtime Cache; if the per-car `getCarDetail` entry ever
 * shows writes outpacing reads, it belongs on plain `"use cache"` (or nothing) and
 * the work belongs back in the DB layer.
 * Where an uncached read is used in BOTH `generateMetadata` and the page body —
 * `getCarDetail`, and `getCarsCount` via the hub pages' request-scoped loaders —
 * React `cache()` collapses it to a single read per request. See the Next caching
 * docs in node_modules/next/dist/docs (use-cache, use-cache-remote).
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
 * NOTE on persistence: the homepage/hub/sitemap queries use plain `"use cache"` —
 * they render into the STATIC SHELL, where the output is durably cached by
 * Vercel's ISR infrastructure anyway; a remote lookup would add latency for
 * nothing. `"use cache: remote"` is reserved for the two RUNTIME reads above,
 * where plain `"use cache"` degrades to a per-instance in-memory LRU with ~zero
 * cross-request hit rate on serverless. No self-managed Redis/KV: Vercel supplies
 * the Runtime Cache handler automatically (see docs/caching/runtime-cache);
 * catalog feed perf remains solved at the DB layer (projections + summaries).
 */
/**
 * Per-CAR tag, so a single car can be expired without blowing away every cached
 * car read. `CACHE_TAGS.cars` is carried by ~14 cached queries — including the
 * ~945k-key `getCarDetail` remote cache and the `cacheLife("days")` sitemap
 * chunks — so using it to hide ONE car (a paid de-index) would discard all of
 * them and re-earn the cost from the database.
 *
 * `getCarDetail` carries BOTH tags: the broad one keeps the existing site-wide
 * kill-switch working, the narrow one is what a single-car mutation should
 * expire. Expire it with `updateTag()`, NOT `revalidateTag(tag, "max")` — "max"
 * is stale-while-revalidate, so the next visitor would still be served the
 * de-indexed car (see the Next 16 revalidateTag/updateTag docs in
 * node_modules/next/dist/docs). `updateTag` is Server-Action-only.
 */
export function carCacheTag(carId: number): string {
  return `car-${carId}`;
}

export const CACHE_TAGS = {
  /** All car listings (both buy-now and auction). */
  cars: "cars",
  /** Buy-now listings shown on the homepage. */
  buyNowCars: "cars-buy-now",
  /** Auction listings shown on the homepage. */
  auctionCars: "cars-auction",
  /** Active US/Canada transport tariffs (admin-uploaded); revalidated on upload. */
  usTariffs: "us-tariffs",
  /** Admin-editable calculator config (fees/commission/rates); revalidated on save. */
  calcConfig: "calc-config",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
