import { desc, eq, sql } from "drizzle-orm";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { normalizeVin } from "@/lib/vin";

/**
 * Resolve whatever an admin pastes into the publish box to a single car id.
 *
 * They will have a `/avtomobil/{id}` URL open, or a lot number, or a VIN — never
 * an internal id on its own. Unlike the de-index desk, which must fan a VIN out
 * to EVERY matching car row (one vehicle owns several), publishing targets one
 * advert for one listing, so this returns the NEWEST matching car: the most
 * recent relist is the one currently on offer.
 */

export type CarLookupHit = {
  carId: number;
  title: string | null;
  year: number | null;
  vin: string | null;
  lotNumber: string | null;
  domainName: string | null;
};

/** `https://www.selectauto.bg/avtomobil/50290?x=1` → `50290`. */
function carIdFromInput(raw: string): number | null {
  const fromUrl = raw.match(/\/avtomobil\/(\d+)/);
  if (fromUrl) return Number(fromUrl[1]);
  if (/^\d+$/.test(raw)) return Number(raw);
  return null;
}

export async function lookupCarForMobilebg(rawQuery: string): Promise<CarLookupHit[]> {
  if (!(await getBackOfficeSession())) throw new Error("FORBIDDEN");

  const query = (rawQuery ?? "").trim();
  if (!query) return [];

  const db = getDb();

  const select = {
    carId: schema.cars.id,
    title: schema.cars.title,
    year: schema.cars.year,
    vin: schema.cars.vin,
    lotNumber: schema.auctionLots.lotNumber,
    domainName: schema.auctionLots.domainName,
  };

  const carId = carIdFromInput(query);
  if (carId !== null) {
    return db
      .select(select)
      .from(schema.cars)
      .leftJoin(schema.auctionLots, eq(schema.auctionLots.carId, schema.cars.id))
      .where(eq(schema.cars.id, carId))
      .orderBy(desc(schema.auctionLots.id))
      .limit(1);
  }

  const vin = normalizeVin(query);
  if (vin && /^[A-Z0-9]{11,17}$/.test(vin)) {
    // Same expression as `cars_vin_normalized_idx` (migration 0044) — keep it
    // identical or the index stops being used.
    return db
      .select(select)
      .from(schema.cars)
      .leftJoin(schema.auctionLots, eq(schema.auctionLots.carId, schema.cars.id))
      .where(sql`upper(btrim(${schema.cars.vin})) = ${vin}`)
      .orderBy(desc(schema.cars.id))
      .limit(5);
  }

  return db
    .select(select)
    .from(schema.auctionLots)
    .innerJoin(schema.cars, eq(schema.cars.id, schema.auctionLots.carId))
    .where(eq(schema.auctionLots.lotNumber, query))
    .orderBy(desc(schema.auctionLots.id))
    .limit(5);
}
