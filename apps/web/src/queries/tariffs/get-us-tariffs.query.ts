import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { OWNER_QUOTED_YARDS } from "@/data/us-transport-owner-yards";
import { US_TARIFF_SEED } from "@/data/us-transport-seed";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import type { UsTariffData } from "@/lib/us-transport";

/**
 * The active US/Canada transport tariffs (admin-uploaded via /admin/tarifi),
 * shaped as a `UsTariffData` the resolver consumes. Read by BOTH the server
 * (the /api/us-tariffs route the client fetches, and the calculator-offer
 * recompute) so client + server always agree.
 *
 * Cached with `"use cache"` + tag `usTariffs` (revalidated on upload) + a long
 * `cacheLife("days")` — tariffs change only when the owner uploads a new file.
 * Falls back to the generated static seed when no active version exists or the
 * DB is unreachable (same convention as the catalog queries).
 *
 * `OWNER_QUOTED_YARDS` is appended to an uploaded dataset too. The upload tables
 * have no column for `flatUsdByType`, so without this overlay the first admin
 * upload would silently re-price those six yards (a flat $2 150 Las Vegas quote
 * would become $2 150 inland + $1 690 container) or drop them entirely. Appended
 * LAST so a real uploaded row for the same yard wins (first-write-wins indexing).
 */
export async function getUsTariffs(): Promise<UsTariffData> {
  "use cache";
  cacheTag(CACHE_TAGS.usTariffs);
  cacheLife("days");

  try {
    const db = getDb();
    const active = await db
      .select({ id: schema.tariffUploads.id })
      .from(schema.tariffUploads)
      .where(eq(schema.tariffUploads.active, true))
      .limit(1);
    const uploadId = active[0]?.id;
    if (!uploadId) return US_TARIFF_SEED;

    const [inlandRows, containerRows] = await Promise.all([
      db
        .select()
        .from(schema.usInlandTariffs)
        .where(eq(schema.usInlandTariffs.uploadId, uploadId))
        .orderBy(asc(schema.usInlandTariffs.location)),
      db
        .select()
        .from(schema.usContainerPrices)
        .where(eq(schema.usContainerPrices.uploadId, uploadId)),
    ]);

    if (inlandRows.length === 0 || containerRows.length === 0) return US_TARIFF_SEED;

    const container: UsTariffData["container"] = {};
    for (const r of containerRows) {
      (container[r.config] ??= {})[r.terminal] = r.price;
    }

    return {
      inland: [
        ...inlandRows.map((r) => ({
          location: r.location,
          auction: r.auction,
          city: r.city ?? "",
          state: r.state ?? "",
          zip: r.zip ?? "",
          terminal: r.terminal,
          inland: r.inland,
        })),
        ...OWNER_QUOTED_YARDS,
      ],
      container,
    };
  } catch (error) {
    console.error("[get-us-tariffs] query failed, using static seed", error);
    return US_TARIFF_SEED;
  }
}
