import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { slugify } from "@/lib/car-slug";
import { getDb, schema } from "@/lib/db";

/**
 * Resolve a `{make}/{model}` slug pair (from the `/avtomobili/marka/...` hub URLs)
 * back to the manufacturer/model EXTERNAL ids the catalog filters use
 * (`?brand=&model=`). There is no slug column in the DB (see `lib/car-slug.ts`),
 * so we read the small reference tables, slug every candidate name, and match.
 *
 * Cached with `"use cache"` + `cacheLife("days")`: the reference tables (~117
 * brands / ~1286 models) are tiny, shared across all visitors, and change only
 * with the daily reference sync — the same footing as `getCarBrands`. Caching it
 * also lets the hub page resolve without forcing the whole route dynamic. Fails
 * closed (returns null) so a DB hiccup renders a 404 rather than a 500.
 *
 * Collision handling: if two makes (or two models within a make) slug to the same
 * string — e.g. hypothetically "MG" and "Mg" — we pick the one with the greater
 * `cars_qty` (the more relevant inventory for that slug), deterministically.
 * `name` can be null upstream; such rows have no slug and are skipped.
 */

export type CarHubResolution = {
  brandId: number;
  brandName: string;
  modelId: number;
  modelName: string;
};

export type BrandHubResolution = {
  brandId: number;
  brandName: string;
};

/** Pick the row whose slugged `name` matches `slug`, breaking ties by `carsQty`. */
function matchBySlug<T extends { name: string | null; carsQty: number | null }>(
  rows: T[],
  slug: string,
): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (!row.name) continue;
    if (slugify(row.name) !== slug) continue;
    if (best === null || (row.carsQty ?? 0) > (best.carsQty ?? 0)) best = row;
  }
  return best;
}

/**
 * Resolve `make`/`model` slugs → external ids + display names. Returns null when
 * either slug doesn't match a known make/model (→ the page renders `notFound()`).
 * Does NOT check inventory count — that thin-content guard lives in the page, so
 * a valid-but-empty make/model still resolves here (and the page decides to 404
 * or noindex it).
 */
export async function resolveCarHub(makeSlug: string, modelSlug: string): Promise<CarHubResolution | null> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  try {
    const db = getDb();

    const brands = await db
      .select({
        externalId: schema.manufacturers.externalId,
        name: schema.manufacturers.name,
        carsQty: schema.manufacturers.carsQty,
      })
      .from(schema.manufacturers)
      .orderBy(asc(schema.manufacturers.name));

    const brand = matchBySlug(brands, makeSlug);
    if (!brand) return null;

    const models = await db
      .select({
        externalId: schema.vehicleModels.externalId,
        name: schema.vehicleModels.name,
        carsQty: schema.vehicleModels.carsQty,
      })
      .from(schema.vehicleModels)
      .where(eq(schema.vehicleModels.manufacturerExternalId, brand.externalId))
      .orderBy(asc(schema.vehicleModels.name));

    const model = matchBySlug(models, modelSlug);
    if (!model) return null;

    return {
      brandId: brand.externalId,
      brandName: brand.name ?? makeSlug,
      modelId: model.externalId,
      modelName: model.name ?? modelSlug,
    };
  } catch (error) {
    console.error("[resolve-car-hub] query failed, returning null", error);
    return null;
  }
}

/**
 * Resolve just a `{make}` slug → brand external id + name (for the brand hub
 * `/avtomobili/marka/{make}`). Same slug-match-with-collision-tiebreak as
 * `resolveCarHub`'s brand step. Null when the slug matches no known make (→ the
 * brand hub page `notFound()`s). Cached like the model resolver.
 */
export async function resolveBrandHub(makeSlug: string): Promise<BrandHubResolution | null> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  try {
    const brands = await getDb()
      .select({
        externalId: schema.manufacturers.externalId,
        name: schema.manufacturers.name,
        carsQty: schema.manufacturers.carsQty,
      })
      .from(schema.manufacturers)
      .orderBy(asc(schema.manufacturers.name));

    const brand = matchBySlug(brands, makeSlug);
    if (!brand) return null;
    return { brandId: brand.externalId, brandName: brand.name ?? makeSlug };
  } catch (error) {
    console.error("[resolve-brand-hub] query failed, returning null", error);
    return null;
  }
}

/**
 * The INDEXABILITY count for a SINGLE hub, read from the SAME `car_listing_facets`
 * summary the hub sitemap uses (`getSitemapBrands`/`getSitemapHubs`). The hub page
 * gates its `noindex` on this — NOT on the live `getCarsCount` it shows to users —
 * so the page's index decision and the sitemap's inclusion decision share ONE
 * source and can never contradict (a sitemap URL is never rendered `noindex`,
 * which Google flags). Brand hub: dim='brand', val=brandId. Model hub: dim='model',
 * val=modelId, val2=brandId (ids are the manufacturer/model EXTERNAL ids the
 * resolvers return). Returns 0 when no summary row exists → `noindex` (same as the
 * sitemap omitting it). Cached like the resolvers; fails **closed** (0 → noindex,
 * matching the sitemap's fail-closed-empty) on a DB hiccup.
 */
export async function getHubFacetCount(brandId: number, modelId?: number): Promise<number> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const cf = schema.carListingFacets;
  try {
    const where =
      modelId === undefined
        ? and(eq(cf.tableKind, "active"), eq(cf.dim, "brand"), eq(cf.val, String(brandId)))
        : and(
            eq(cf.tableKind, "active"),
            eq(cf.dim, "model"),
            eq(cf.val, String(modelId)),
            eq(cf.val2, String(brandId)),
          );
    const rows = await getDb()
      .select({ n: sql<number>`${cf.n}::int` })
      .from(cf)
      .where(where)
      .limit(1);
    return rows[0]?.n ?? 0;
  } catch (error) {
    console.error("[get-hub-facet-count] query failed, returning 0 (noindex)", error);
    return 0;
  }
}

/** One model-hub link on a brand hub: the model's name + its active listing count. */
export type BrandModelHub = { modelName: string; listingCount: number };

/**
 * The INDEXABLE model hubs for a brand — the "browse by model" link grid on the
 * brand hub, and the set of models whose hubs the brand should pass authority to.
 * Reads the `car_listing_facets` summary (dim='model', val2=brand id) filtered to
 * `n >= minListings` (the SAME thin-content threshold), joined to `vehicle_models`
 * for the name (drops nameless ids — they have no slug). Ordered by inventory depth
 * so the richest models lead. Cached like the resolvers; empty on error.
 */
export async function getBrandModelHubs(brandId: number, minListings: number): Promise<BrandModelHub[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const cf = schema.carListingFacets;
  try {
    const rows = await getDb()
      .select({ modelName: schema.vehicleModels.name, listingCount: sql<number>`${cf.n}::int` })
      .from(cf)
      .innerJoin(schema.vehicleModels, sql`${schema.vehicleModels.externalId}::text = ${cf.val}`)
      .where(
        and(
          eq(cf.tableKind, "active"),
          eq(cf.dim, "model"),
          eq(cf.val2, String(brandId)),
          gte(sql`${cf.n}::int`, minListings),
        ),
      )
      .orderBy(sql`${cf.n}::int DESC`);

    return rows
      .filter((r) => r.modelName)
      .map((r) => ({ modelName: r.modelName as string, listingCount: r.listingCount }));
  } catch (error) {
    console.error("[get-brand-model-hubs] query failed, returning []", error);
    return [];
  }
}
