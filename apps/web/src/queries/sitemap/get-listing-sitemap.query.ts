import { cacheLife, cacheTag } from "next/cache";
import { asc, gt, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";

/**
 * Sitemap data for the ~945k active car listings (`/avtomobil/{carId}`). Split
 * into 50k-URL chunks (Google's per-sitemap limit) consumed by
 * `app/avtomobil/sitemap.ts` via `generateSitemaps`.
 *
 * **Keyset, not OFFSET, chunking** — the same lesson the catalog learned (see
 * docs/05-projection-tables-car-listings.md §4): a deep `OFFSET 900000` scan-and-discards ~900k rows
 * (~2.5s and growing per chunk, measured), whereas an indexed `car_id > cursor
 * ORDER BY car_id LIMIT 50000` is ~1.6s flat regardless of depth (measured). So
 * we precompute the chunk-boundary cursors once (every 50,000th `car_id`), then
 * each chunk does one fast indexed read from its cursor.
 *
 * Both functions fail **closed** (empty result) on a DB error so a build never
 * breaks on a sitemap hiccup — the static `app/sitemap.ts` still ships the core
 * pages, and Google re-crawls the listing sitemaps later.
 */

export const SITEMAP_CHUNK_SIZE = 50_000;

/**
 * The `car_id` cursor that STARTS each chunk: chunk `i` contains rows with
 * `car_id > cursors[i]` (cursor 0 is `0`, so chunk 0 starts from the smallest
 * id). One windowed query over the PK; cached (listings change slowly, and this
 * runs once per build for all chunks). Returns `[]` on error → zero chunks.
 */
export async function getSitemapChunkCursors(): Promise<number[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  try {
    // Every Nth car_id in car_id order becomes a chunk-start boundary. The first
    // boundary (rn=0) is the smallest id; we emit it as cursor 0 (`car_id > 0`)
    // so chunk 0 includes it. Subsequent cursors are the *last* id of the prior
    // chunk so the next chunk starts strictly after it — so we shift: cursor[i]
    // = the (i*N)-th id minus nothing; using `car_id > cursor` with cursor =
    // boundary id would SKIP that boundary row. To keep it simple & exact we
    // take boundaries at rn % N == 0 and use cursor[0]=0, cursor[i]=boundary[i].
    const rows = await getDb().execute<{ car_id: number }>(sql`
      SELECT car_id FROM (
        SELECT car_id, row_number() OVER (ORDER BY car_id) - 1 AS rn
        FROM ${schema.carListings}
      ) s
      WHERE rn % ${SITEMAP_CHUNK_SIZE} = 0
      ORDER BY car_id
    `);
    const boundaries = rows.rows.map((r) => Number(r.car_id));
    if (boundaries.length === 0) return [];
    // boundaries[i] is the FIRST id of chunk i. To fetch chunk i with
    // `car_id > cursor`, cursor must be strictly below that first id: use
    // (boundaries[i] - 1). Chunk 0's first id - 1 includes the smallest row.
    return boundaries.map((firstId) => firstId - 1);
  } catch (error) {
    console.error("[sitemap] chunk-cursor query failed, emitting no listing sitemaps", error);
    return [];
  }
}

/** One sitemap entry: the listing's canonical (slashless) path + last-modified. */
export type SitemapListing = { carId: number; updatedAt: Date };

/**
 * One 50k chunk of listings, keyset-read from `cursor` (exclusive) in `car_id`
 * order. `cursor` comes from {@link getSitemapChunkCursors}. Empty on error.
 */
export async function getSitemapListingChunk(cursor: number): Promise<SitemapListing[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const cl = schema.carListings;
  try {
    const rows = await getDb()
      .select({ carId: cl.carId, updatedAt: cl.updatedAt })
      .from(cl)
      .where(gt(cl.carId, cursor))
      .orderBy(asc(cl.carId))
      .limit(SITEMAP_CHUNK_SIZE);
    return rows.map((r) => ({ carId: r.carId, updatedAt: r.updatedAt }));
  } catch (error) {
    console.error("[sitemap] listing chunk query failed", error);
    return [];
  }
}
