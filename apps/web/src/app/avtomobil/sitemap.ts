import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";
import { getSitemapChunkCursors, getSitemapListingChunk } from "@/queries/sitemap";

/**
 * Listing sitemaps for the ~945k active cars, split into 50k-URL chunks (Google's
 * limit). Served at `/avtomobil/sitemap/{id}.xml`; robots.txt enumerates these
 * (Next 16 doesn't auto-create a `<sitemapindex>` for `generateSitemaps` — see
 * `app/sitemap.ts`).
 *
 * Chunking is KEYSET on `car_id` (not OFFSET — see the query module for the
 * measured why): `generateSitemaps` returns one entry per chunk; `sitemap({id})`
 * reads that chunk from its precomputed `car_id` cursor. Both fail closed
 * (empty) so the build never breaks on a DB hiccup.
 *
 * ⚠️ Next 16: the `id` passed to `sitemap` is a `Promise<string>` and must be
 * awaited (breaking change from v15 where it was a plain value) — verified in
 * the v16 generate-sitemaps docs.
 */
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const cursors = await getSitemapChunkCursors();
  return cursors.map((_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const chunkIndex = Number(await id);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) return [];

  const cursors = await getSitemapChunkCursors();
  const cursor = cursors[chunkIndex];
  if (cursor === undefined) return [];

  const listings = await getSitemapListingChunk(cursor);
  return listings.map((l) => ({
    url: `${SITE_URL}/avtomobil/${l.carId}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
}
