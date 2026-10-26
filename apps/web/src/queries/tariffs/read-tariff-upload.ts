import { getDb, schema } from "@/lib/db";
import type { UsTariffData } from "@/lib/us-transport";
import { asc, eq } from "drizzle-orm";

/**
 * One stored tariff version's rows, shaped as the resolver's dataset — null when
 * either table is empty, which every reader treats as "use the built-in table".
 * Shared by the cached `getUsTariffs` and the admin-only baseline; no gate here,
 * so it stays out of the barrel.
 */
export async function readTariffUpload(uploadId: number): Promise<UsTariffData | null> {
  const db = getDb();
  const [inlandRows, containerRows] = await Promise.all([
    db
      .select()
      .from(schema.usInlandTariffs)
      .where(eq(schema.usInlandTariffs.uploadId, uploadId))
      .orderBy(asc(schema.usInlandTariffs.location)),
    db.select().from(schema.usContainerPrices).where(eq(schema.usContainerPrices.uploadId, uploadId)),
  ]);
  if (inlandRows.length === 0 || containerRows.length === 0) return null;

  const container: UsTariffData["container"] = {};
  for (const r of containerRows) {
    (container[r.config] ??= {})[r.terminal] = r.price;
  }
  return {
    inland: inlandRows.map((r) => ({
      location: r.location,
      auction: r.auction,
      city: r.city ?? "",
      state: r.state ?? "",
      zip: r.zip ?? "",
      terminal: r.terminal,
      inland: r.inland,
    })),
    container,
  };
}
