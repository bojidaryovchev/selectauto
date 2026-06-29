/**
 * Database access layer for Neon Serverless Postgres.
 *
 * Serverless connection strategy
 * ------------------------------
 * Lambdas reach Neon over the public internet (NO VPC — see README tradeoffs).
 * We use the Neon *pooled* connection string (host contains "-pooler"), which
 * routes through Neon's PgBouncer so thousands of short-lived Lambda invocations
 * don't exhaust Postgres backends.
 *
 * We keep a module-scoped `pg.Pool` so that warm Lambda invocations reuse the
 * connection, but cap it at a tiny size (max: 1-2) because each concurrent
 * Lambda is its own process. Pacing is sequential anyway (1 req/sec), so we are
 * not opening many connections at once.
 *
 * All writes are idempotent upserts (INSERT ... ON CONFLICT DO UPDATE) keyed on
 * the unique indexes defined in db/migrations/0001_initial.sql.
 */
import pg from "pg";
import { Logger } from "./logger.js";
import { normalizeArchivedLot, normalizeCar, normalizeLot } from "./normalize.js";
import type { ApiArchivedLot, ApiCar, FlowType } from "./types.js";

const { Pool } = pg;

// Module-level logger for connection/pool events (no per-request context).
const dbLog = new Logger({ component: "db" });

let pool: pg.Pool | null = null;

/** Lazily create (and reuse across warm invocations) a small pooled client. */
export function getPool(): pg.Pool {
  if (pool) return pool;

  const rawConnectionString = process.env.NEON_DATABASE_URL;
  if (!rawConnectionString) throw new Error("NEON_DATABASE_URL is not set");

  // We configure TLS explicitly via the `ssl` object below (full cert
  // validation). A `sslmode=...` query param in the URL is redundant and, as of
  // node-postgres v8.16+, emits a noisy "SECURITY WARNING: ... aliases for
  // verify-full" deprecation notice (surfaced as ERROR in CloudWatch). Strip it
  // so our explicit `ssl` config is the single source of truth and the warning
  // goes away. Behaviour is unchanged: rejectUnauthorized:true === verify-full.
  const connectionString = stripSslMode(rawConnectionString);

  pool = new Pool({
    connectionString,
    // Neon requires TLS. The pooled endpoint presents a publicly-trusted cert,
    // so full verification (rejectUnauthorized: true) works without a custom CA.
    ssl: { rejectUnauthorized: true },
    // Keep this tiny: one Lambda process == a couple of connections at most.
    max: Number(process.env.PG_POOL_MAX ?? 2),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // PgBouncer (transaction pooling) does not support prepared statements.
    // node-postgres uses simple/extended query protocol; we avoid named
    // prepared statements, so this is compatible with the pooled endpoint.
  });

  pool.on("error", (err) => {
    // Connection-level errors shouldn't crash the process; log and let the
    // next query re-acquire. Step Functions will retry transient failures.
    dbLog.error("pg_pool_error", { error: err.message });
  });

  return pool;
}

/**
 * Remove the `sslmode` query parameter from a Postgres connection string.
 * TLS is configured explicitly via the `ssl` Pool option, so this param is
 * redundant; dropping it silences node-postgres's `sslmode` deprecation warning.
 * Falls back to a regex strip if the string isn't a parseable URL.
 */
function stripSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return connectionString.replace(/([?&])sslmode=[^&]*(&|$)/i, (_m, pre, post) => (post === "&" ? pre : ""));
  }
}

/**
 * Refresh a projection read model for a batch of cars, by calling its recompute
 * SQL function (`recompute_car_listings` for the active catalog, migration 0007;
 * or `recompute_archived_car_listings` for the past/sold view, migration 0010+).
 * These functions are the single source of truth for the per-car pick-strategy,
 * shared with the one-time backfill. The active and archived tables are kept
 * DISJOINT (a car is active XOR past), so each write path refreshes BOTH (see the
 * call sites) — a lot changing state moves the car between tables.
 *
 * Called at the END of each write path (after the cars/auction_lots upserts), so
 * the projection reflects the rows just written. Set-based: ONE round-trip for
 * the whole page (recompute of ~1000 ids measured at ~160ms), never per-row —
 * the Lambda pool is tiny (max 2). Idempotent and order-independent, so a Step
 * Functions page retry that re-runs it is harmless.
 *
 * Best-effort: a failure here must NOT fail the page (the cars/auction_lots
 * writes already succeeded and are the source of truth; the next sync / nightly
 * sweep re-derives the projections). We log and swallow.
 */
async function recomputeListings(
  client: pg.PoolClient,
  fn: "recompute_car_listings_counted" | "recompute_archived_car_listings_counted",
  carIds: Iterable<number>,
): Promise<void> {
  const ids = Array.from(new Set([...carIds].filter((id) => Number.isInteger(id))));
  if (ids.length === 0) return;
  try {
    await client.query(`SELECT ${fn}($1::int[])`, [ids]);
  } catch (err) {
    dbLog.error(`${fn}_failed`, { error: (err as Error).message, count: ids.length });
  }
}

/**
 * Upsert a single page of AuctionsAPI car records into `cars` + `auction_lots`.
 *
 * For each car:
 *   1. upsert the car row (returns local cars.id)
 *   2. upsert each of its lots, linked to that car
 *
 * Returns the number of lot rows written (the practical "records processed").
 * Idempotent: re-running the same page produces no duplicate rows.
 */
export async function upsertCarsAndLots(rawCars: ApiCar[]): Promise<number> {
  const db = getPool();
  const client = await db.connect();
  let lotsWritten = 0;
  // Cars whose lots were (re)written this page → recompute their projection rows
  // (both the active and archived read models) once at the end (set-based).
  const touchedCarIds = new Set<number>();

  try {
    for (const rawCar of rawCars) {
      const car = normalizeCar(rawCar);

      // ---- upsert car ----
      // Conflict target is external_car_id. When external_car_id is NULL the
      // unique index treats rows as distinct, so we still insert a car row and
      // rely on (domain_id, lot_number) to dedupe the lots. See README fallback.
      let carId: number | null = null;
      if (car.externalCarId !== null && car.externalCarId !== undefined) {
        const carRes = await client.query<{ id: number }>(
          `INSERT INTO cars
             (external_car_id, vin, title, year, manufacturer_id, model_id, generation_id,
              body_type, vehicle_type, color, fuel_type, transmission, drive_wheel, engine, raw_json, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
           ON CONFLICT (external_car_id) DO UPDATE SET
             vin = EXCLUDED.vin,
             title = EXCLUDED.title,
             year = EXCLUDED.year,
             manufacturer_id = EXCLUDED.manufacturer_id,
             model_id = EXCLUDED.model_id,
             generation_id = EXCLUDED.generation_id,
             body_type = EXCLUDED.body_type,
             vehicle_type = EXCLUDED.vehicle_type,
             color = EXCLUDED.color,
             fuel_type = EXCLUDED.fuel_type,
             transmission = EXCLUDED.transmission,
             drive_wheel = EXCLUDED.drive_wheel,
             engine = EXCLUDED.engine,
             raw_json = EXCLUDED.raw_json,
             updated_at = now()
           RETURNING id`,
          [
            car.externalCarId,
            car.vin,
            car.title,
            car.year,
            car.manufacturerId,
            car.modelId,
            car.generationId,
            car.bodyType,
            car.vehicleType,
            car.color,
            car.fuelType,
            car.transmission,
            car.driveWheel,
            car.engine,
            car.rawJson,
          ],
        );
        carId = carRes.rows[0]?.id ?? null;
      }

      // ---- upsert lots ----
      const lots = rawCar.lots ?? [];
      for (const rawLot of lots) {
        const lot = normalizeLot(rawLot);
        if (lot.lotNumber === null || lot.domainId === null) {
          // Without (domain_id, lot_number) we cannot dedupe safely. Skip but log.
          dbLog.warn("skip_lot_missing_key", { externalLotId: lot.externalLotId });
          continue;
        }

        await client.query(
          `INSERT INTO auction_lots
             (external_lot_id, car_id, lot_number, domain_id, domain_name, status, sale_date,
              odometer_km, bid_price, buy_now_price, final_bid, buy_now, condition, damage_main,
              seller, location_country, location_state, location_city, image_url,
              archived, archived_at, raw_json, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
              COALESCE($20, FALSE), $21, $22, now())
           ON CONFLICT (domain_id, lot_number) DO UPDATE SET
             external_lot_id = EXCLUDED.external_lot_id,
             -- Only overwrite car_id when we have a non-null one (don't unlink).
             car_id = COALESCE(EXCLUDED.car_id, auction_lots.car_id),
             domain_name = EXCLUDED.domain_name,
             status = EXCLUDED.status,
             sale_date = EXCLUDED.sale_date,
             odometer_km = EXCLUDED.odometer_km,
             bid_price = EXCLUDED.bid_price,
             buy_now_price = EXCLUDED.buy_now_price,
             final_bid = EXCLUDED.final_bid,
             buy_now = EXCLUDED.buy_now,
             condition = EXCLUDED.condition,
             damage_main = EXCLUDED.damage_main,
             seller = EXCLUDED.seller,
             location_country = EXCLUDED.location_country,
             location_state = EXCLUDED.location_state,
             location_city = EXCLUDED.location_city,
             image_url = EXCLUDED.image_url,
             -- Reflect the API's archived flag. The /cars feed sends archived=false
             -- for active lots and (via search-* detail) archived=true for a
             -- concluded lot, so honor whatever the payload reports. When the lot
             -- arrives without an archived value ($20 IS NULL), keep the existing
             -- state rather than flipping a previously-archived lot back to active.
             archived = CASE WHEN $20::boolean IS NULL THEN auction_lots.archived ELSE $20::boolean END,
             archived_at = COALESCE(EXCLUDED.archived_at, auction_lots.archived_at),
             raw_json = EXCLUDED.raw_json,
             updated_at = now()`,
          [
            lot.externalLotId,
            carId,
            lot.lotNumber,
            lot.domainId,
            lot.domainName,
            lot.status,
            lot.saleDate,
            lot.odometerKm,
            lot.bidPrice,
            lot.buyNowPrice,
            lot.finalBid,
            lot.buyNow,
            lot.condition,
            lot.damageMain,
            lot.seller,
            lot.locationCountry,
            lot.locationState,
            lot.locationCity,
            lot.imageUrl,
            lot.archived,
            lot.archivedAt,
            lot.rawJson,
          ],
        );
        lotsWritten += 1;
        // This car now has a (re)written lot; mark it for car_listings recompute.
        if (carId !== null) touchedCarIds.add(carId);
      }
    }

    // Refresh both read models for every car touched this page. A car (re)seen in
    // /cars is active → it lands in car_listings AND (if it was there) drops out of
    // the archived table (which excludes cars that still have an active lot). The
    // *_counted wrappers also maintain car_listing_counts via a before/after diff
    // in the same transaction (migration 0016), so broad-view counts stay exact.
    await recomputeListings(client, "recompute_car_listings_counted", touchedCarIds);
    await recomputeListings(client, "recompute_archived_car_listings_counted", touchedCarIds);

    return lotsWritten;
  } finally {
    client.release();
  }
}

/**
 * Mark the lots from an archived-lots page as archived/sold.
 *
 * Input is the FLAT archived-lot shape from /api/archived-lots (ApiArchivedLot),
 * NOT car records. We do NOT hard-delete: set archived = TRUE and archived_at on
 * matching (domain_id, lot_number) rows, and also persist the archive's
 * status/prices/sale_date. If a lot isn't in our DB yet, we insert it (archived)
 * so the archive signal is not lost. Idempotent.
 *
 * archived_at is taken from the upstream `archived_at` when present (preserving
 * the real archive time), falling back to now().
 *
 * Returns the number of lots archived.
 */
export async function archiveLots(rawLots: ApiArchivedLot[]): Promise<number> {
  const db = getPool();
  const client = await db.connect();
  let archived = 0;
  // Cars whose lots were archived this page → recompute both projections (the
  // archived lot drops/swaps the car's ACTIVE card and adds/refreshes its PAST
  // card). RETURNING gives us the resolved local car_id (the payload has only the
  // external id).
  const touchedCarIds = new Set<number>();

  try {
    for (const rawLot of rawLots) {
      const lot = normalizeArchivedLot(rawLot);
      if (lot.lotNumber === null || lot.domainId === null) continue;

      // The archived-lots payload carries the AuctionsAPI external car id
      // (lot.externalCarId). Our auction_lots.car_id is a LOCAL FK to cars.id,
      // so we resolve it via a subquery on cars.external_car_id. If the car
      // isn't in our DB yet, the subquery yields NULL and COALESCE keeps any
      // existing link (on conflict) or leaves it NULL (on fresh insert).
      const res = await client.query<{ car_id: number | null }>(
        `INSERT INTO auction_lots
           (external_lot_id, car_id, lot_number, domain_id, domain_name, status,
            bid_price, buy_now_price, final_bid, sale_date,
            archived, archived_at, raw_json, updated_at)
         VALUES (
            $1,
            (SELECT id FROM cars WHERE external_car_id = $2),
            $3,$4,$5,$6,$7,$8,$9,$10,
            TRUE, COALESCE($11::timestamptz, now()), $12, now())
         ON CONFLICT (domain_id, lot_number) DO UPDATE SET
           archived = TRUE,
           archived_at = COALESCE(auction_lots.archived_at, EXCLUDED.archived_at, now()),
           car_id = COALESCE(EXCLUDED.car_id, auction_lots.car_id),
           status = EXCLUDED.status,
           bid_price = COALESCE(EXCLUDED.bid_price, auction_lots.bid_price),
           buy_now_price = COALESCE(EXCLUDED.buy_now_price, auction_lots.buy_now_price),
           final_bid = COALESCE(EXCLUDED.final_bid, auction_lots.final_bid),
           sale_date = COALESCE(EXCLUDED.sale_date, auction_lots.sale_date),
           raw_json = EXCLUDED.raw_json,
           updated_at = now()
         RETURNING car_id`,
        [
          lot.externalLotId,
          lot.externalCarId,
          lot.lotNumber,
          lot.domainId,
          lot.domainName,
          lot.status,
          lot.bidPrice,
          lot.buyNowPrice,
          lot.finalBid,
          lot.saleDate,
          lot.archivedAt,
          lot.rawJson,
        ],
      );
      archived += 1;
      // The archived lot's car (if linked) may need its card promoted or removed.
      const archivedCarId = res.rows[0]?.car_id;
      if (typeof archivedCarId === "number") touchedCarIds.add(archivedCarId);
    }

    // Refresh both read models for every car whose lot was archived this page. The
    // archived lot drops/swaps the car's ACTIVE card (recompute_car_listings) and
    // adds/refreshes its PAST card (recompute_archived_car_listings). The *_counted
    // wrappers also keep car_listing_counts in sync (migration 0016).
    await recomputeListings(client, "recompute_car_listings_counted", touchedCarIds);
    await recomputeListings(client, "recompute_archived_car_listings_counted", touchedCarIds);

    return archived;
  } finally {
    client.release();
  }
}

/* ===========================================================================
 * Reference data upserts
 * ======================================================================== */

export async function upsertManufacturer(row: {
  externalId: number;
  name: string | null;
  imageUrl: string | null;
  carsQty: number | null;
  rawJson: unknown;
}): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO manufacturers (external_id, name, image_url, cars_qty, raw_json, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (external_id) DO UPDATE SET
       name = EXCLUDED.name,
       image_url = EXCLUDED.image_url,
       cars_qty = EXCLUDED.cars_qty,
       raw_json = EXCLUDED.raw_json,
       updated_at = now()`,
    [row.externalId, row.name, row.imageUrl, row.carsQty, row.rawJson],
  );
}

export async function upsertModel(row: {
  externalId: number;
  manufacturerExternalId: number | null;
  name: string | null;
  imageUrl: string | null;
  carsQty: number | null;
  rawJson: unknown;
}): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO vehicle_models
       (external_id, manufacturer_external_id, name, image_url, cars_qty, raw_json, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (external_id) DO UPDATE SET
       manufacturer_external_id = EXCLUDED.manufacturer_external_id,
       name = EXCLUDED.name,
       image_url = EXCLUDED.image_url,
       cars_qty = EXCLUDED.cars_qty,
       raw_json = EXCLUDED.raw_json,
       updated_at = now()`,
    [row.externalId, row.manufacturerExternalId, row.name, row.imageUrl, row.carsQty, row.rawJson],
  );
}

export async function upsertGeneration(row: {
  externalId: number;
  modelExternalId: number | null;
  name: string | null;
  fromYear: number | null;
  toYear: number | null;
  rawJson: unknown;
}): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO vehicle_generations
       (external_id, model_external_id, name, from_year, to_year, raw_json, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (external_id) DO UPDATE SET
       model_external_id = EXCLUDED.model_external_id,
       name = EXCLUDED.name,
       from_year = EXCLUDED.from_year,
       to_year = EXCLUDED.to_year,
       raw_json = EXCLUDED.raw_json,
       updated_at = now()`,
    [row.externalId, row.modelExternalId, row.name, row.fromYear, row.toYear, row.rawJson],
  );
}

/** Count existing manufacturers — used to skip reference sync unless forced. */
export async function countManufacturers(): Promise<number> {
  const db = getPool();
  const res = await db.query<{ count: string }>("SELECT count(*)::text AS count FROM manufacturers");
  return Number(res.rows[0]?.count ?? "0");
}

/* ===========================================================================
 * Detail refresh upsert
 * ======================================================================== */

/**
 * Upsert a single detailed listing (from search-lot / search-vin). The detail
 * endpoints are assumed to return the same car+lots shape; we reuse the bulk
 * upsert. TODO: confirm detail payload shape vs list payload shape.
 */
export async function upsertDetail(rawCar: ApiCar): Promise<number> {
  return upsertCarsAndLots([rawCar]);
}

/* ===========================================================================
 * sync_runs helpers (idempotency + observability + checkpointing)
 * ======================================================================== */

export async function createSyncRun(flowType: FlowType, metadata: unknown): Promise<number> {
  const db = getPool();
  const res = await db.query<{ id: number }>(
    `INSERT INTO sync_runs (flow_type, status, started_at, metadata_json)
     VALUES ($1, 'running', now(), $2)
     RETURNING id`,
    [flowType, metadata ?? null],
  );
  return res.rows[0].id;
}

export interface SyncRunUpdate {
  status?: "running" | "succeeded" | "failed";
  pagesProcessed?: number;
  lastPageProcessed?: number;
  recordsProcessedDelta?: number; // added to existing records_processed
  errorMessage?: string;
  finished?: boolean;
}

/** Partial, additive update of a sync run row. Safe to call repeatedly. */
export async function updateSyncRun(id: number, update: SyncRunUpdate): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE sync_runs SET
       status = COALESCE($2, status),
       pages_processed = COALESCE($3, pages_processed),
       last_page_processed = COALESCE($4, last_page_processed),
       records_processed = records_processed + COALESCE($5, 0),
       error_message = COALESCE($6, error_message),
       finished_at = CASE WHEN $7 THEN now() ELSE finished_at END
     WHERE id = $1`,
    [
      id,
      update.status ?? null,
      update.pagesProcessed ?? null,
      update.lastPageProcessed ?? null,
      update.recordsProcessedDelta ?? null,
      update.errorMessage ?? null,
      update.finished ?? false,
    ],
  );
}
