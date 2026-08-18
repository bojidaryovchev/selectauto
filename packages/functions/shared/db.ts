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
 * Recompute both projection read models for an arbitrary batch of car ids, via
 * the *_counted wrappers (so car_listings/_archived AND car_listing_counts/
 * _facets are all refreshed in one transaction per wrapper). This is the exact
 * operation the ingestion hooks and the backfill perform; exposed standalone so
 * the periodic drift-repair sweep (driftSweep) can re-run it over every car to
 * repair any best-effort recompute that was swallowed during ingestion.
 *
 * Idempotent + order-independent (the wrappers read CURRENT state and write the
 * whole row + a before/after count/facet diff). Uses a single pooled connection
 * for the pair. Not best-effort here: the sweep WANTS to know if a recompute
 * fails, so errors propagate to the caller (the Step Functions Catch records it).
 */
export async function recomputeProjectionsForCars(carIds: Iterable<number>): Promise<number> {
  const ids = Array.from(new Set([...carIds].filter((id) => Number.isInteger(id))));
  if (ids.length === 0) return 0;
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query(`SELECT recompute_car_listings_counted($1::int[])`, [ids]);
    await client.query(`SELECT recompute_archived_car_listings_counted($1::int[])`, [ids]);
    return ids.length;
  } finally {
    client.release();
  }
}

/**
 * Fetch the next window of car ids strictly greater than `afterId`, ascending,
 * for the drift-sweep keyset walk. Returns up to `limit` ids (empty array at the
 * end of the table). Keyset (not OFFSET) because cars.id is sparse.
 */
export async function fetchCarIdsAfter(afterId: number, limit: number): Promise<number[]> {
  const db = getPool();
  const res = await db.query<{ id: number }>(`SELECT id FROM cars WHERE id > $1 ORDER BY id ASC LIMIT $2`, [
    afterId,
    limit,
  ]);
  return res.rows.map((r) => r.id);
}

/* ===========================================================================
 * Set-based page upserts
 *
 * Two properties every statement below is built around:
 *
 * 1. BATCHED, not row-at-a-time. The page is shipped as ONE jsonb parameter and
 *    expanded server-side with jsonb_array_elements. The previous implementation
 *    issued one round trip per car AND per lot — ~2000 sequential round trips for
 *    a 1000-car page, measured at ~12.6s of pure latency per page (98 pages =
 *    22 min for one hourly run) against a pool capped at 2 connections. Passing
 *    the page as jsonb (rather than parallel arrays) avoids array-literal
 *    escaping entirely for values that contain arbitrary JSON.
 *
 * 2. NO-OP WRITES ARE SKIPPED. Every DO UPDATE carries a WHERE that fires only
 *    when something actually differs. This matters far more than it looks:
 *    assigning `raw_json` explicitly makes Postgres re-TOAST the value even when
 *    it is byte-identical — deleting and reinserting every chunk — so an
 *    unchanged row still cost a full heap update + TOAST rewrite + WAL + the
 *    autovacuum that follows. Measured on live data: of ~1.56M lot writes/day
 *    only ~442k could correspond to a real upstream change, i.e. >=72% of the
 *    write volume changed nothing.
 *
 *    Comparing the derived columns' SOURCE is both sufficient and necessary:
 *    every one of them (including thumbnail_url) is a pure function of the raw
 *    payload — see normalize.ts. The extra OR-terms cover the two things that are
 *    NOT derived from it: the local car_id linkage, and the archived flag (which
 *    archiveLots can set independently).
 *
 *    ...BUT COMPARING THE RAW BLOB IS NOT THAT TEST (fixed 2026-08-17). The lot
 *    payload embeds six of AuctionsAPI's own re-crawl timestamps, which move on
 *    every upstream crawl regardless of whether any value did, so
 *    `raw_json IS DISTINCT FROM EXCLUDED.raw_json` was very nearly a constant
 *    TRUE and the no-op guard above was, for lots, doing almost nothing. Measured
 *    2026-08-17: 356 128 lot rows rewritten in 24h, only 40 308 (11.3%) with a
 *    real change — 88.7% of the entire write pipeline, including both projection
 *    recomputes and their index maintenance, was driven by a moving timestamp.
 *    The guard now compares `lotFingerprint(...)` (below), which strips those
 *    stamps in BOTH payload shapes and leaves everything else — so a genuinely
 *    new field still refreshes raw_json and the backfill property is preserved.
 *    `cars` is unaffected: its payload carries no such stamp (~0.4% write rate).
 *
 *    OPERATIONAL CONSEQUENCE: ingestion no longer rewrites unchanged rows, so
 *    adding or changing a DERIVED column no longer back-fills itself on the next
 *    sync. Any such change now REQUIRES an explicit backfill (the established
 *    pattern — see db/backfill-*.mjs and migration 0013).
 * ======================================================================== */

/** Rows per INSERT statement — keeps one statement's payload modest while still
 *  collapsing a 1000-car page from ~2000 round trips to ~a dozen. */
const UPSERT_CHUNK = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * `archived` is NOT NULL in the schema, so the INSERT column list must carry a
 * non-null value and EXCLUDED.archived therefore loses the "absent" signal the
 * row-at-a-time version got from a raw NULL parameter. We recover it losslessly
 * from EXCLUDED.raw_json: normalizeLot derives `archived` from exactly this key
 * (boolean -> value, anything else -> null), so reading it back is equivalent.
 * `jsonb_typeof(...) = 'boolean'` is NULL-safe — a missing key yields NULL, which
 * is not TRUE, so it falls through to "keep what we already have".
 */
const LOT_ARCHIVED_EXPR = `CASE WHEN jsonb_typeof(EXCLUDED.raw_json->'archived') = 'boolean'
        THEN (EXCLUDED.raw_json->>'archived')::boolean
        ELSE auction_lots.archived END`;

/**
 * A lot payload with AuctionsAPI's own bookkeeping timestamps removed — the value
 * the change-detection guard actually compares.
 *
 * WHY THIS EXISTS. The guard used to be a plain
 * `auction_lots.raw_json IS DISTINCT FROM EXCLUDED.raw_json`, which sounds exact
 * and is in fact almost always TRUE: the lot payload carries SIX re-crawl stamps
 * (`updated_at`, `created_at`, `bid_updated_at`, `buy_now_updated_at`,
 * `final_bid_updated_at`, `sale_date_updated_at`), and upstream bumps them every
 * time it re-crawls the lot whether or not a single value moved. Measured on live
 * data 2026-08-17: of 356 128 lot rows rewritten in 24h, only 40 308 (11.3%) had
 * any real bid / buy-now / final-bid / sale-date change. The other 88.7% paid a
 * full heap update + TOAST rewrite + WAL + both projection recomputes (and up to
 * 16 index entries each) to store bytes identical to what was already there.
 *
 * The `cars` payload has no such stamp, which is why the identical guard on that
 * table writes only ~0.4% of the ~700k records fetched per day — same feed, same
 * code path, different volatility. `cars` therefore keeps the plain comparison.
 *
 * SHAPE HAZARD (verified against live data, both feeds — do not simplify this):
 * the two endpoints disagree on price shape (see docs/01 §6b).
 *   - `/cars` sends `bid`/`buy_now`/`final_bid` as NUMBER or NULL, with the
 *     timestamps as TOP-LEVEL `*_updated_at` keys.
 *   - `/archived-lots` sends them as OBJECTS carrying a NESTED `updated_at`.
 * `jsonb - text` raises "cannot delete from scalar", so the nested strip must be
 * guarded by `jsonb_typeof(...) = 'object'` or the active feed would crash on
 * every page. The outer CASE likewise tolerates a NULL / non-object payload.
 *
 * Kept as an inlined expression rather than a SQL function ON PURPOSE: migrations
 * are hand-run and are NOT applied on deploy (see README), so a function would
 * introduce a deploy-ordering hazard where shipping the Lambda before running the
 * migration breaks every ingestion page. Inlining makes the change atomic with the
 * deploy, matching how LOT_ARCHIVED_EXPR above is handled.
 */
const lotFingerprint = (col: string): string => `(
        CASE WHEN ${col} IS NULL OR jsonb_typeof(${col}) <> 'object' THEN ${col} ELSE
          (${col} - 'updated_at' - 'created_at' - 'bid_updated_at'
                  - 'buy_now_updated_at' - 'final_bid_updated_at' - 'sale_date_updated_at')
          || COALESCE((
               SELECT jsonb_object_agg(k, (${col} -> k) - 'updated_at')
               FROM unnest(ARRAY['bid','buy_now','final_bid']) AS k
               WHERE jsonb_typeof(${col} -> k) = 'object'), '{}'::jsonb)
        END)`;

/** The lot-payload change test: true only when something we'd actually store moved. */
const LOT_PAYLOAD_CHANGED = `${lotFingerprint("auction_lots.raw_json")}
          IS DISTINCT FROM ${lotFingerprint("EXCLUDED.raw_json")}`;

/** Rows-written vs rows-skipped accounting for one page. */
export interface UpsertPageResult {
  /** auction_lots rows actually inserted or updated. */
  lotsWritten: number;
  /** auction_lots rows the API re-sent unchanged → write skipped. */
  lotsSkipped: number;
  /** cars rows actually inserted or updated. */
  carsWritten: number;
  /** cars rows the API re-sent unchanged → write skipped. */
  carsSkipped: number;
}

/**
 * Upsert a single page of AuctionsAPI car records into `cars` + `auction_lots`.
 *
 *   1. upsert the page's cars   (one statement per UPSERT_CHUNK)
 *   2. resolve external_car_id -> local cars.id for the whole page (one statement)
 *   3. upsert the page's lots, linked to those car ids
 *   4. recompute both projection read models for the cars actually touched
 *
 * Idempotent: re-running the same page produces no duplicate rows AND, now, no
 * writes at all.
 */
export async function upsertCarsAndLots(rawCars: ApiCar[]): Promise<UpsertPageResult> {
  const db = getPool();
  const client = await db.connect();
  // Cars whose car row OR any of whose lots were ACTUALLY written this page →
  // recompute their projection rows (both read models) once at the end.
  // NOTE: this now includes cars whose own row changed but whose lots did not —
  // the row-at-a-time version only tracked cars with a written lot, so a car
  // whose title/model changed (or that had no lots at all) never refreshed its
  // projection.
  const touchedCarIds = new Set<number>();

  try {
    // ---- 1. cars ----
    // Conflict target is external_car_id. A car WITHOUT one cannot be deduped
    // (the unique index treats NULLs as distinct, so inserting would duplicate on
    // every sync), so it is skipped here exactly as before and its lots still
    // dedupe on (domain_id, lot_number). Dedupe within the page too: a repeated
    // external_car_id in one statement would raise "ON CONFLICT DO UPDATE cannot
    // affect row a second time". Last occurrence wins (freshest).
    const carsByExternalId = new Map<number, ReturnType<typeof normalizeCar>>();
    for (const rawCar of rawCars) {
      const car = normalizeCar(rawCar);
      if (car.externalCarId === null || car.externalCarId === undefined) continue;
      carsByExternalId.set(car.externalCarId, car);
    }
    const cars = [...carsByExternalId.values()];

    let carsWritten = 0;
    for (const part of chunk(cars, UPSERT_CHUNK)) {
      const res = await client.query<{ id: number }>(
        `INSERT INTO cars
           (external_car_id, vin, title, year, manufacturer_id, model_id, generation_id,
            body_type, vehicle_type, color, fuel_type, transmission, drive_wheel, engine,
            raw_json, updated_at)
         SELECT
           (e->>'externalCarId')::bigint, e->>'vin', e->>'title', (e->>'year')::int,
           (e->>'manufacturerId')::bigint, (e->>'modelId')::bigint, (e->>'generationId')::bigint,
           e->>'bodyType', e->>'vehicleType', e->>'color', e->>'fuelType',
           e->>'transmission', e->>'driveWheel', e->>'engine',
           e->'rawJson', now()
         FROM jsonb_array_elements($1::jsonb) AS e
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
         -- Every other column is a pure function of raw_json (normalize.ts), so
         -- this single comparison is exactly "did anything about this car change".
         WHERE cars.raw_json IS DISTINCT FROM EXCLUDED.raw_json
         RETURNING id`,
        [JSON.stringify(part)],
      );
      carsWritten += res.rowCount ?? 0;
      // RETURNING only yields rows that were actually inserted/updated — precisely
      // the cars whose projection needs refreshing.
      for (const r of res.rows) touchedCarIds.add(r.id);
    }

    // ---- 2. resolve external_car_id -> local cars.id ----
    // Must be a separate read: with the no-op guard above, an UNCHANGED car
    // returns NO row, so RETURNING alone can no longer supply the id. Without
    // this, a brand-new lot on an unchanged car would be inserted with a NULL
    // car_id and never appear in either projection.
    const carIdByExternalId = new Map<number, number>();
    if (cars.length > 0) {
      const idRes = await client.query<{ id: number; external_car_id: string | number }>(
        `SELECT id, external_car_id FROM cars WHERE external_car_id = ANY($1::bigint[])`,
        [cars.map((c) => c.externalCarId)],
      );
      for (const r of idRes.rows) carIdByExternalId.set(Number(r.external_car_id), r.id);
    }

    // ---- 3. lots ----
    // Same page-level dedupe rationale as cars, on the (domain_id, lot_number) key.
    const lotsByKey = new Map<string, Record<string, unknown>>();
    for (const rawCar of rawCars) {
      const externalCarId = normalizeCar(rawCar).externalCarId;
      const carId = externalCarId !== null ? (carIdByExternalId.get(externalCarId) ?? null) : null;
      for (const rawLot of rawCar.lots ?? []) {
        const lot = normalizeLot(rawLot);
        if (lot.lotNumber === null || lot.domainId === null) {
          // Without (domain_id, lot_number) we cannot dedupe safely. Skip but log.
          dbLog.warn("skip_lot_missing_key", { externalLotId: lot.externalLotId });
          continue;
        }
        lotsByKey.set(`${lot.domainId} ${lot.lotNumber}`, { ...lot, carId });
      }
    }
    const lots = [...lotsByKey.values()];

    let lotsWritten = 0;
    for (const part of chunk(lots, UPSERT_CHUNK)) {
      const res = await client.query<{ car_id: number | null }>(
        `INSERT INTO auction_lots
           (external_lot_id, car_id, lot_number, domain_id, domain_name, status, sale_date,
            odometer_km, bid_price, buy_now_price, final_bid, buy_now, condition, damage_main,
            seller, location_country, location_state, location_city, image_url,
            archived, archived_at, raw_json, thumbnail_url, updated_at)
         SELECT
           (e->>'externalLotId')::bigint, (e->>'carId')::int, e->>'lotNumber',
           (e->>'domainId')::int, e->>'domainName', e->>'status', (e->>'saleDate')::timestamptz,
           (e->>'odometerKm')::bigint, (e->>'bidPrice')::numeric, (e->>'buyNowPrice')::numeric,
           (e->>'finalBid')::numeric, (e->>'buyNow')::boolean, e->>'condition', e->>'damageMain',
           e->>'seller', e->>'locationCountry', e->>'locationState', e->>'locationCity',
           e->>'imageUrl',
           COALESCE((e->>'archived')::boolean, FALSE), (e->>'archivedAt')::timestamptz,
           e->'rawJson', e->>'cardImageUrl', now()
         FROM jsonb_array_elements($1::jsonb) AS e
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
           -- Card image comes straight from the source CDN now (no bake) — just
           -- overwrite with the freshly-recomputed per-source card URL.
           thumbnail_url = EXCLUDED.thumbnail_url,
           -- Reflect the API's archived flag, keeping the existing state when the
           -- payload carries no boolean (see LOT_ARCHIVED_EXPR).
           archived = ${LOT_ARCHIVED_EXPR},
           archived_at = COALESCE(EXCLUDED.archived_at, auction_lots.archived_at),
           raw_json = EXCLUDED.raw_json,
           updated_at = now()
         -- Fire only on a real change. The payload fingerprint covers every column
         -- derived from raw_json while ignoring upstream's re-crawl timestamps
         -- (see lotFingerprint — comparing the raw blob made this guard fire on
         -- ~89% of rows that had not actually changed). The other two terms cover
         -- what is NOT derived from the payload: the local car_id linkage, and an
         -- archived flag that archiveLots may have flipped independently.
         WHERE ${LOT_PAYLOAD_CHANGED}
            OR auction_lots.car_id IS DISTINCT FROM COALESCE(EXCLUDED.car_id, auction_lots.car_id)
            OR auction_lots.archived IS DISTINCT FROM (${LOT_ARCHIVED_EXPR})
         RETURNING car_id`,
        [JSON.stringify(part)],
      );
      lotsWritten += res.rowCount ?? 0;
      for (const r of res.rows) if (typeof r.car_id === "number") touchedCarIds.add(r.car_id);
    }

    // ---- 4. projections ----
    // Refresh both read models for every car touched this page. A car (re)seen in
    // /cars is active → it lands in car_listings AND (if it was there) drops out of
    // the archived table (which excludes cars that still have an active lot). The
    // *_counted wrappers also maintain car_listing_counts via a before/after diff
    // in the same transaction (migration 0016), so broad-view counts stay exact.
    await recomputeListings(client, "recompute_car_listings_counted", touchedCarIds);
    await recomputeListings(client, "recompute_archived_car_listings_counted", touchedCarIds);

    return {
      lotsWritten,
      lotsSkipped: lots.length - lotsWritten,
      carsWritten,
      carsSkipped: cars.length - carsWritten,
    };
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
    // Page-level dedupe on the conflict key (see upsertCarsAndLots); last wins.
    const byKey = new Map<string, ReturnType<typeof normalizeArchivedLot>>();
    for (const rawLot of rawLots) {
      const lot = normalizeArchivedLot(rawLot);
      if (lot.lotNumber === null || lot.domainId === null) continue;
      byKey.set(`${lot.domainId} ${lot.lotNumber}`, lot);
    }
    const lots = [...byKey.values()];

    for (const part of chunk(lots, UPSERT_CHUNK)) {
      // The archived-lots payload carries the AuctionsAPI external car id
      // (externalCarId). Our auction_lots.car_id is a LOCAL FK to cars.id, so we
      // resolve it with a LEFT JOIN on cars.external_car_id (unique, so the join
      // can never fan out). If the car isn't in our DB yet the join yields NULL
      // and COALESCE keeps any existing link (on conflict) or leaves it NULL.
      const res = await client.query<{ car_id: number | null }>(
        `INSERT INTO auction_lots
           (external_lot_id, car_id, lot_number, domain_id, domain_name, status,
            bid_price, buy_now_price, final_bid, sale_date,
            archived, archived_at, raw_json, updated_at)
         SELECT
           (e->>'externalLotId')::bigint, c.id, e->>'lotNumber',
           (e->>'domainId')::int, e->>'domainName', e->>'status',
           (e->>'bidPrice')::numeric, (e->>'buyNowPrice')::numeric,
           (e->>'finalBid')::numeric, (e->>'saleDate')::timestamptz,
           TRUE, COALESCE((e->>'archivedAt')::timestamptz, now()), e->'rawJson', now()
         FROM jsonb_array_elements($1::jsonb) AS e
         LEFT JOIN cars c ON c.external_car_id = (e->>'externalCarId')::bigint
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
         -- Fire only on a real change. The status/price columns are all derived
         -- from raw_json (or COALESCE-preserved), so the payload fingerprint
         -- covers them while ignoring upstream's re-crawl timestamps (see
         -- lotFingerprint); the other terms cover the state this statement sets
         -- independently of the payload: the archived flag, its timestamp, and
         -- the car linkage. NB: this feed sends prices as OBJECTS with a nested
         -- updated_at, which is exactly why the fingerprint strips both shapes.
         WHERE auction_lots.archived IS NOT TRUE
            OR auction_lots.archived_at IS NULL
            OR ${LOT_PAYLOAD_CHANGED}
            OR auction_lots.car_id IS DISTINCT FROM COALESCE(EXCLUDED.car_id, auction_lots.car_id)
         RETURNING car_id`,
        [JSON.stringify(part)],
      );
      archived += res.rowCount ?? 0;
      // The archived lot's car (if linked) may need its card promoted or removed.
      for (const r of res.rows) if (typeof r.car_id === "number") touchedCarIds.add(r.car_id);
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
 *
 * Returns lots actually WRITTEN — 0 now legitimately means "already up to date",
 * not "nothing happened".
 */
export async function upsertDetail(rawCar: ApiCar): Promise<number> {
  const res = await upsertCarsAndLots([rawCar]);
  return res.lotsWritten;
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
