import { getSessionWith } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { carTitle } from "@/lib/mobilebg/car-title";
import { sql } from "drizzle-orm";

/**
 * The newest catalog car with this VIN that isn't de-indexed, for the VIN desk's header. `cars.vin` is stored only
 * trimmed (archived lots arrive lower-cased), so the match is on upper(btrim(vin)), which `cars_vin_normalized_idx`
 * (migration 0044) serves. `vin` must be normalised. Null without `reports.order`.
 *
 * `ORDER BY id + 0`, not `id`: see list-vin-reports.query.ts — with `id` Postgres walks the primary key instead of
 * using the VIN index, and a VIN with no car took 59 s.
 */
export async function findCatalogCarByVin(vin: string): Promise<{ id: number; title: string } | null> {
  if (!(await getSessionWith("reports.order"))) return null;
  const result = await getDb().execute<{ id: number; title: string | null; year: number | null }>(sql`
    SELECT id, title, year
    FROM cars
    WHERE upper(btrim(vin)) = ${vin} AND vin IS NOT NULL AND deindexed_at IS NULL
    ORDER BY id + 0 DESC
    LIMIT 1
  `);
  const row = result.rows[0];
  return row ? { id: row.id, title: carTitle(row.year, row.title, row.id) } : null;
}
