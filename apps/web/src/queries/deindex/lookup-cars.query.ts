import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { isUsableVin, normalizeVin } from "@/lib/vin";
import { desc, eq, sql } from "drizzle-orm";

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

/** A car found by its id or lot number: what the admin sees to pick, or to learn why it can't be hidden. */
export type DeindexFoundCar = {
  carId: number;
  vin: string | null;
  title: string | null;
  year: number | null;
  /** How the query matched it. */
  via: "id" | "lot";
};

export type LookupResult = {
  query: string;
  vin: string | null;
  candidates: DeindexCandidate[];
  /**
   * The query matched several vehicles — a bare number that is one car's id and
   * another's lot number, or a lot number reused across auctions. The admin
   * picks one; nothing is listed until then.
   */
  choices: DeindexFoundCar[];
  /**
   * Cars the query found that have no usable VIN. Requests are keyed on the VIN
   * (it is what catches every listing of the vehicle), so these can't be hidden
   * — said plainly instead of „not found".
   */
  withoutVin: DeindexFoundCar[];
};

/** `https://www.selectauto.bg/avtomobil/50290?x=1` → `50290`. */
function carIdFromUrl(raw: string): number | null {
  const fromUrl = raw.match(/\/avtomobil\/(\d+)/);
  return fromUrl ? Number(fromUrl[1]) : null;
}

/** `cars.id` is a Postgres integer; a longer number can only be a lot number. */
const MAX_CAR_ID = 2_147_483_647;

export async function lookupDeindexCandidates(rawQuery: string): Promise<LookupResult> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const query = (rawQuery ?? "").trim();
  const result: LookupResult = { query, vin: null, candidates: [], choices: [], withoutVin: [] };
  if (!query) return result;

  const db = getDb();
  const found = { carId: schema.cars.id, vin: schema.cars.vin, title: schema.cars.title, year: schema.cars.year };
  const byId = async (carId: number): Promise<DeindexFoundCar[]> =>
    carId > MAX_CAR_ID
      ? []
      : (await db.select(found).from(schema.cars).where(eq(schema.cars.id, carId)).limit(1)).map((c) => ({
          ...c,
          via: "id" as const,
        }));
  // By the lot number alone: the (domain_id, lot_number) index still serves it —
  // Postgres 18 skip-scans the leading column (~3 ms on 3.8M lots, measured).
  const byLot = async (lot: string): Promise<DeindexFoundCar[]> =>
    (
      await db
        .select(found)
        .from(schema.auctionLots)
        .innerJoin(schema.cars, eq(schema.cars.id, schema.auctionLots.carId))
        .where(eq(schema.auctionLots.lotNumber, lot))
        .orderBy(desc(schema.auctionLots.id))
        .limit(5)
    ).map((c) => ({ ...c, via: "lot" as const }));

  // Resolve to a VIN first — the VIN is what a request is keyed on, so an id or
  // lot number is only ever a way of FINDING the vehicle, never the key itself.
  let vin = normalizeVin(query);
  const vinLike = /^[A-Z0-9]{11,17}$/.test(vin ?? "");
  if (!vinLike || /^\d+$/.test(query)) {
    const urlId = carIdFromUrl(query);
    // A bare number is a car id OR a lot number — Copart, IAAI and Encar lot
    // numbers are all digits, and 26 713 of them are also some other car's id.
    // Read as an id only, a lot number found nothing, or the wrong car.
    const cars =
      urlId !== null
        ? await byId(urlId)
        : /^\d+$/.test(query)
          ? [...(await byId(Number(query))), ...(await byLot(query))]
          : await byLot(query);

    const byVin = new Map<string, DeindexFoundCar>();
    for (const car of cars) {
      const v = normalizeVin(car.vin);
      if (!isUsableVin(v)) {
        if (!result.withoutVin.some((c) => c.carId === car.carId)) result.withoutVin.push(car);
      } else if (!byVin.has(v)) byVin.set(v, car);
    }
    if (byVin.size > 1) return { ...result, choices: [...byVin.values()] };
    // An all-digit VIN (rare, but they exist) is still tried as one when no car
    // has that id or lot number.
    vin = byVin.keys().next().value ?? (vinLike && cars.length === 0 ? vin : null);
  }

  if (!vin) return result;

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

  return { ...result, vin, candidates: [...byCar.values()] };
}
