import { desc, eq, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { normalizeVin } from "@/lib/vin";

/**
 * Find every car a delisting request could cover, from whatever the customer
 * actually sent.
 *
 * They will send a VIN, a lot number, or a pasted `/avtomobil/{id}` URL — never
 * an internal id. And because one physical vehicle owns several `cars` rows (a
 * relist, or the same car at Copart then IAAI), the answer is a LIST: the admin
 * has to see every URL that will be suppressed before charging for it.
 */

export type DeindexCandidate = {
  carId: number;
  vin: string | null;
  title: string | null;
  year: number | null;
  lotNumber: string | null;
  domainName: string | null;
  listedActive: boolean;
  listedArchived: boolean;
  deindexedAt: Date | null;
  url: string;
};

export type LookupResult = {
  query: string;
  vin: string | null;
  candidates: DeindexCandidate[];
};

/** `https://www.selectauto.bg/avtomobil/50290?x=1` → `50290`. */
function carIdFromInput(raw: string): number | null {
  const fromUrl = raw.match(/\/avtomobil\/(\d+)/);
  if (fromUrl) return Number(fromUrl[1]);
  if (/^\d+$/.test(raw)) return Number(raw);
  return null;
}

export async function lookupDeindexCandidates(rawQuery: string): Promise<LookupResult> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const query = (rawQuery ?? "").trim();
  if (!query) return { query, vin: null, candidates: [] };

  const db = getDb();

  // Resolve to a VIN first — the VIN is what a request is keyed on, so an id or
  // lot number is only ever a way of FINDING the vehicle, never the key itself.
  let vin = normalizeVin(query);
  const looksLikeVin = /^[A-Z0-9]{11,17}$/.test(vin ?? "");

  if (!looksLikeVin) {
    vin = null;
    const carId = carIdFromInput(query);
    if (carId !== null) {
      const byId = await db
        .select({ vin: schema.cars.vin })
        .from(schema.cars)
        .where(eq(schema.cars.id, carId))
        .limit(1);
      vin = normalizeVin(byId[0]?.vin);
    } else {
      // Lot number → its car → that car's VIN.
      const byLot = await db
        .select({ vin: schema.cars.vin })
        .from(schema.auctionLots)
        .innerJoin(schema.cars, eq(schema.cars.id, schema.auctionLots.carId))
        .where(eq(schema.auctionLots.lotNumber, query))
        .orderBy(desc(schema.auctionLots.id))
        .limit(1);
      vin = normalizeVin(byLot[0]?.vin);
    }
  }

  if (!vin) return { query, vin: null, candidates: [] };

  // Same expression as `cars_vin_normalized_idx` (migration 0044).
  const rows = await db
    .select({
      carId: schema.cars.id,
      vin: schema.cars.vin,
      title: schema.cars.title,
      year: schema.cars.year,
      deindexedAt: schema.cars.deindexedAt,
      lotNumber: schema.auctionLots.lotNumber,
      domainName: schema.auctionLots.domainName,
      listedActive: sql<boolean>`EXISTS (SELECT 1 FROM car_listings cl WHERE cl.car_id = ${schema.cars.id})`,
      listedArchived: sql<boolean>`EXISTS (SELECT 1 FROM car_listings_archived cla WHERE cla.car_id = ${schema.cars.id})`,
    })
    .from(schema.cars)
    .leftJoin(schema.auctionLots, eq(schema.auctionLots.carId, schema.cars.id))
    .where(sql`upper(btrim(${schema.cars.vin})) = ${vin}`)
    .orderBy(desc(schema.cars.id));

  // The left join fans out over lots; collapse to one row per car.
  const byCar = new Map<number, DeindexCandidate>();
  for (const r of rows) {
    const existing = byCar.get(r.carId);
    if (existing) {
      existing.lotNumber ??= r.lotNumber;
      existing.domainName ??= r.domainName;
      continue;
    }
    byCar.set(r.carId, {
      carId: r.carId,
      vin: r.vin,
      title: r.title,
      year: r.year,
      lotNumber: r.lotNumber,
      domainName: r.domainName,
      listedActive: r.listedActive,
      listedArchived: r.listedArchived,
      deindexedAt: r.deindexedAt,
      url: `/avtomobil/${r.carId}`,
    });
  }

  return { query, vin, candidates: [...byCar.values()] };
}
