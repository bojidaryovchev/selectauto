import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";

/**
 * Sitemap data for the make/model SEO hubs (`/avtomobili/marka/{make}/{model}`).
 *
 * Only INDEXABLE hubs belong here — a sitemap must never list a URL the page
 * renders `noindex` (Google flags the contradiction). So we apply the SAME
 * inventory threshold the hub page uses for its thin-content guard
 * (`MIN_LISTINGS_TO_INDEX`), read from the precomputed `car_listing_facets`
 * summary (dim='model': val=model externalId, val2=brand externalId, n=active
 * count — migration 0017) rather than aggregating the ~945k projection. At ~1.3k
 * qualifying models this is far under Google's 50k-per-sitemap cap, so — unlike the
 * chunked listing sitemap — a single query/file suffices (no `generateSitemaps`).
 *
 * Names come from an INNER JOIN to manufacturers/vehicle_models (same as the
 * facets query): the join drops any id with no name, which is correct here because
 * a nameless make/model has no slug and thus no hub URL. The slug is derived from
 * the name at emit time (see `lib/car-slug.ts`) — one source of truth, no slug
 * column.
 *
 * Cached `"use cache"` + `cacheLife("days")` (tag `cars`): tiny, shared, changes
 * only with the daily reference/summary sync — same footing as the listing chunk
 * cursors. Fails **closed** (empty) so a DB hiccup drops the hub sitemap rather
 * than breaking the build; the core `sitemap.ts` still ships.
 */

/** One hub sitemap row: the make/model NAMES (slugged at emit) + count for lastmod
 *  priority. `updatedAt` isn't tracked per make/model in the summary, so callers use
 *  a build timestamp — the hub content tracks live inventory, which changes daily. */
export type SitemapHub = { brandName: string; modelName: string; listingCount: number };

export async function getSitemapHubs(minListings: number): Promise<SitemapHub[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const cf = schema.carListingFacets;
  try {
    const rows = await getDb()
      .select({
        brandName: schema.manufacturers.name,
        modelName: schema.vehicleModels.name,
        listingCount: sql<number>`${cf.n}::int`,
      })
      .from(cf)
      // val = model external id → vehicle_models; val2 = brand external id → manufacturers.
      .innerJoin(schema.vehicleModels, sql`${schema.vehicleModels.externalId}::text = ${cf.val}`)
      .innerJoin(schema.manufacturers, sql`${schema.manufacturers.externalId}::text = ${cf.val2}`)
      .where(
        and(
          eq(cf.tableKind, "active"),
          eq(cf.dim, "model"),
          sql`${cf.val2} <> ''`,
          gte(sql`${cf.n}::int`, minListings),
        ),
      );

    return rows
      .filter((r) => r.brandName && r.modelName)
      .map((r) => ({
        brandName: r.brandName as string,
        modelName: r.modelName as string,
        listingCount: r.listingCount,
      }));
  } catch (error) {
    console.error("[sitemap] hub query failed, emitting no hub sitemap", error);
    return [];
  }
}

/** One brand-hub sitemap row: the make NAME (slugged at emit) + active count. */
export type SitemapBrandHub = { brandName: string; listingCount: number };

/**
 * The indexable BRAND hubs (`/avtomobili/marka/{make}`) — the tier above the model
 * hubs. Same threshold + summary-table source (dim='brand': val=brand externalId,
 * n=active count), joined to `manufacturers` for the slug-able name. ~96 rows —
 * fits the same single hub sitemap. Cached/failure-closed like {@link getSitemapHubs}.
 */
export async function getSitemapBrands(minListings: number): Promise<SitemapBrandHub[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const cf = schema.carListingFacets;
  try {
    const rows = await getDb()
      .select({ brandName: schema.manufacturers.name, listingCount: sql<number>`${cf.n}::int` })
      .from(cf)
      .innerJoin(schema.manufacturers, sql`${schema.manufacturers.externalId}::text = ${cf.val}`)
      .where(and(eq(cf.tableKind, "active"), eq(cf.dim, "brand"), gte(sql`${cf.n}::int`, minListings)));

    return rows
      .filter((r) => r.brandName)
      .map((r) => ({ brandName: r.brandName as string, listingCount: r.listingCount }));
  } catch (error) {
    console.error("[sitemap] brand-hub query failed, emitting no brand hubs", error);
    return [];
  }
}
