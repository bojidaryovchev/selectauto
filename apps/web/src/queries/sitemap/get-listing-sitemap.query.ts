import { cacheLife, cacheTag } from "next/cache";
import { asc, gt } from "drizzle-orm";
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
 * `car_id > cursors[i]` (cursor 0 sits just below the smallest id). Cached
 * (listings change slowly; runs once per build for all chunks). `[]` on error
 * → zero chunks.
 *
 * Implementation note: this used to be ONE windowed query
 * (`row_number() OVER (ORDER BY car_id)` over all ~945k rows), which
 * materializes the whole PK ordering in a single statement — and repeatedly hit
 * Neon's statement timeout during builds („chunk-cursor query failed …
 * canceling statement due to statement timeout"), silently shipping a robots.txt
 * with NO listing sitemaps. Now it keyset-PROBES one boundary per chunk:
 * `WHERE car_id > cursor ORDER BY car_id OFFSET 50k LIMIT 1` — each probe is a
 * bounded index-only scan of ≤50k entries (fast, far under any statement
 * timeout), and ~19 small probes replace one huge statement. Same exact
 * boundaries as before.
 */
export async function getSitemapChunkCursors(): Promise<number[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const cl = schema.carListings;
  try {
    // Smallest id (index-only, instant). Empty table → no chunks.
    const first = await getDb()
      .select({ carId: cl.carId })
      .from(cl)
      .orderBy(asc(cl.carId))
      .limit(1);
    if (first.length === 0) return [];

    let cursor = first[0].carId - 1;
    const cursors: number[] = [cursor];

    // Each probe finds the FIRST id of the NEXT chunk (the row 50k positions
    // after the current cursor); the next cursor sits just below it. Loop ends
    // when fewer than a full chunk remains. Hard cap = 100 chunks (5M listings)
    // as a runaway guard — log if ever hit so the cap is raised consciously.
    for (let i = 0; i < 100; i++) {
      const next = await getDb()
        .select({ carId: cl.carId })
        .from(cl)
        .where(gt(cl.carId, cursor))
        .orderBy(asc(cl.carId))
        .offset(SITEMAP_CHUNK_SIZE)
        .limit(1);
      if (next.length === 0) return cursors;
      cursor = next[0].carId - 1;
      cursors.push(cursor);
    }
    console.error("[sitemap] chunk-cursor probe hit the 100-chunk cap — raise it");
    return cursors;
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
