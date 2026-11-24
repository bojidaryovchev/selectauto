import { desc, eq, sql } from "drizzle-orm";
import { getSessionWith } from "@/lib/admin";
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
function carIdFromUrl(raw: string): number | null {
  const fromUrl = raw.match(/\/avtomobil\/(\d+)/);
  return fromUrl ? Number(fromUrl[1]) : null;
}

/** `cars.id` is a Postgres integer; a longer number can only be a lot number. */
const MAX_CAR_ID = 2_147_483_647;

export async function lookupCarForMobilebg(rawQuery: string): Promise<CarLookupHit[]> {
  if (!(await getSessionWith("mobilebg.publish"))) throw new Error("FORBIDDEN");

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

  const byId = (carId: number) =>
    db
      .select(select)
      .from(schema.cars)
      .leftJoin(schema.auctionLots, eq(schema.auctionLots.carId, schema.cars.id))
      .where(eq(schema.cars.id, carId))
      .orderBy(desc(schema.auctionLots.id))
      .limit(1);
  // By the lot number alone: the (domain_id, lot_number) index still serves it —
  // Postgres 18 skip-scans the leading column (~3 ms on 3.8M lots, measured).
  const byLot = (lot: string) =>
    db
      .select(select)
      .from(schema.auctionLots)
      .innerJoin(schema.cars, eq(schema.cars.id, schema.auctionLots.carId))
      .where(eq(schema.auctionLots.lotNumber, lot))
      .orderBy(desc(schema.auctionLots.id))
      .limit(5);

  // A link whose id is past the column's range belongs to no car. It used to reach Postgres, fail there and read
  // „Търсенето не бе успешно.".
  const urlId = carIdFromUrl(query);
  if (urlId !== null) return urlId <= MAX_CAR_ID ? byId(urlId) : [];

  // A bare number is a car id OR a lot number: Copart, IAAI and Encar lot
  // numbers are all digits, and 26 713 of them are also some other car's id.
  // Read as an id only, a lot number found nothing — or the wrong car. Ask
  // both; one hit opens at once, several are offered to choose from.
  if (/^\d+$/.test(query)) {
    const asId = Number(query);
    const [idHits, lotHits] = await Promise.all([asId <= MAX_CAR_ID ? byId(asId) : [], byLot(query)]);
    const seen = new Set<number>();
    const hits: CarLookupHit[] = [];
    for (const hit of [...idHits, ...lotHits]) {
      if (seen.has(hit.carId)) continue;
      seen.add(hit.carId);
      hits.push(hit);
    }
    return hits;
  }

  const vin = normalizeVin(query);
  if (vin && /^[A-Z0-9]{11,17}$/.test(vin)) {
    // Same expression as `cars_vin_normalized_idx` (migration 0044) — keep it
    // identical or the index stops being used.
    //
    // Ordered by `cars.id + 0`, not `cars.id`, ON PURPOSE: with `ORDER BY id
    // DESC LIMIT 5` Postgres walked the primary key backwards and filtered every
    // row by VIN, betting on 5 early matches (it guesses ~20 000 cars per VIN),
    // so a VIN with fewer than 5 cars — nearly all of them — read the whole
    // ~4M-row table (a VIN with no car: 59 s, EXPLAIN ANALYZE on production,
    // 24.11.2026). `+ 0` leaves the key no use for the ordering, so the VIN
    // index finds the car's few rows: 14 ms without a car, 7 ms with one.
    return db
      .select(select)
      .from(schema.cars)
      .leftJoin(schema.auctionLots, eq(schema.auctionLots.carId, schema.cars.id))
      .where(sql`upper(btrim(${schema.cars.vin})) = ${vin}`)
      .orderBy(sql`${schema.cars.id} + 0 DESC`)
      .limit(5);
  }

  return byLot(query);
}
