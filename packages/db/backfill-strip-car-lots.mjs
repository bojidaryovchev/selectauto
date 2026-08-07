/**
 * One-time backfill: remove the duplicated `lots[]` array from cars.raw_json.
 *
 * ── Why ──
 * Every lot embedded in cars.raw_json is ALSO stored in full in
 * auction_lots.raw_json, keyed by (domain_id, lot_number). Measured on live data
 * the embedded copy is ~94% of the car payload (13,595 bytes uncompressed vs 779
 * without it), which pushed every car row past the 2 KB TOAST threshold and grew a
 * 9.9 GB TOAST table. Because an upsert assigns raw_json explicitly, Postgres
 * re-TOASTs it on EVERY sync — deleting and reinserting every chunk — which alone
 * accounted for ~50% of ALL row inserts and ~51% of ALL row deletes on the
 * database. Stripping the key makes the car row small enough to never TOAST again.
 *
 * Nothing reads the embedded copy: the only consumer of cars.raw_json anywhere in
 * the repo is web/lib/car-detail-mapper.ts, which reads the TOP-LEVEL `hp` and
 * `cylinders` keys — both verified to survive the strip on a 4,970-row sample.
 *
 * ── LOSSLESS BY CONSTRUCTION ──
 * This does not trust a pre-flight check. Each batch strips a car ONLY after
 * proving, in the same statement, that every lot embedded in that car's raw_json
 * is present as an auction_lots row. Anything unverifiable — a lot with no
 * (domain_id, lot_number) key, a lot with no matching row, or a `lots` value that
 * is not even an array — leaves that car UNTOUCHED and is reported. So a car is
 * only ever stripped of data that provably still exists elsewhere.
 *
 * ── ORDER MATTERS ──
 * Deploy the code change (normalize.ts stripLots) BEFORE running this. If the old
 * Lambda is still live it will re-add `lots` to every car in the next incremental
 * window and partially undo the backfill.
 *
 * Safe to run against prod while ingestion runs: each batch is its own
 * statement/transaction, the walk is resumable, and re-running is a no-op (already
 * stripped rows no longer match `raw_json ? 'lots'`).
 *
 * Usage (NEON_DATABASE_URL auto-loaded from repo-root .env):
 *   node --env-file-if-exists=../../.env backfill-strip-car-lots.mjs --check
 *   node --env-file-if-exists=../../.env backfill-strip-car-lots.mjs
 *   node --env-file-if-exists=../../.env backfill-strip-car-lots.mjs --batch=2000 --start=0 --sleep=100
 *
 * Flags:
 *   --check     report only; strips nothing (run this first)
 *   --batch=N   cars per batch (default 2000 — each row rewrite frees ~12 KB)
 *   --start=N   resume from this car id (default 0)
 *   --sleep=MS  pause between batches to spare the DB/ingestion (default 100)
 */
import pg from "pg";

const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const CHECK_ONLY = process.argv.includes("--check");
const BATCH = arg("batch", 2000);
const SLEEP_MS = arg("sleep", 100);
const START = arg("start", 0);

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("NEON_DATABASE_URL is not set (repo-root .env auto-loads via the npm script).");
  process.exit(1);
}
const clean = (() => {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return connectionString.replace(/([?&])sslmode=[^&]*(&|$)/i, (_m, pre, post) => (post === "&" ? pre : ""));
  }
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A POOL, not a Client. A long-lived single Client against Neon's pooled endpoint
 * gets dropped (PgBouncer recycling, compute autoscale, plain network blips), and a
 * connection-level failure surfaces as an 'error' EVENT on the client — which is
 * emitted outside any query promise, so a try/catch around the query never sees it
 * and the process dies. A Pool discards the broken connection and hands out a fresh
 * one on the next query, which is exactly the recovery this walk needs.
 */
const pool = new pg.Pool({
  connectionString: clean,
  ssl: { rejectUnauthorized: true },
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});
// Without this listener an idle-connection error is an unhandled 'error' event and
// still crashes the process, Pool or not.
pool.on("error", (err) => console.warn(`\n  [pool] ${err.message} — will reconnect on next batch`));
// Applies to every NEW connection, including ones made after a reconnect.
pool.on("connect", (c) => {
  c.query("SET statement_timeout = 180000").catch(() => {});
});

const client = pool;

/**
 * One batch. `emb` explodes each car's embedded lots; `unsafe` is every car with
 * even one lot we cannot prove is recoverable; the UPDATE excludes those.
 *
 * `NOT EXISTS` (not `NOT IN`) on purpose: `NOT IN` against a subquery that yields
 * a NULL silently matches nothing, which would make the whole backfill a no-op.
 */
const BATCH_SQL = (write) => `
WITH batch AS (
  SELECT id, raw_json FROM cars WHERE id > $1 ORDER BY id ASC LIMIT $2
),
target AS (
  SELECT id FROM batch WHERE raw_json ? 'lots'
),
emb AS (
  SELECT b.id AS car_id,
         (l.value->'domain'->>'id')::int AS domain_id,
         l.value->>'lot'                 AS lot_number
  FROM batch b,
       LATERAL jsonb_array_elements(b.raw_json->'lots') l(value)
  WHERE b.raw_json ? 'lots' AND jsonb_typeof(b.raw_json->'lots') = 'array'
),
unsafe AS (
  -- a lot we cannot key, or cannot find in auction_lots
  SELECT DISTINCT e.car_id
  FROM emb e
  WHERE e.domain_id IS NULL
     OR e.lot_number IS NULL
     OR NOT EXISTS (
          SELECT 1 FROM auction_lots al
          WHERE al.domain_id = e.domain_id AND al.lot_number = e.lot_number)
  UNION
  -- a 'lots' value that is not an array at all: unverifiable, so never touch it
  SELECT id FROM batch
  WHERE raw_json ? 'lots' AND jsonb_typeof(raw_json->'lots') <> 'array'
),
${
  write
    ? `stripped AS (
  UPDATE cars c SET raw_json = c.raw_json - 'lots'
  WHERE EXISTS (SELECT 1 FROM target t WHERE t.id = c.id)
    AND NOT EXISTS (SELECT 1 FROM unsafe u WHERE u.car_id = c.id)
  RETURNING c.id
)`
    : `stripped AS (SELECT id FROM target WHERE NOT EXISTS (SELECT 1 FROM unsafe u WHERE u.car_id = target.id))`
}
SELECT
  (SELECT max(id)   FROM batch)    AS cursor,
  (SELECT count(*)  FROM batch)    AS scanned,
  (SELECT count(*)  FROM target)   AS had_lots,
  (SELECT count(*)  FROM stripped) AS stripped,
  (SELECT count(*)  FROM unsafe)   AS unsafe
`;

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 180000");

  const { rows: pre } = await client.query(
    `SELECT count(*)::int AS total, COALESCE(max(id),0) AS maxid FROM cars`,
  );
  console.log(
    `${CHECK_ONLY ? "[CHECK ONLY — no writes] " : ""}cars=${pre[0].total} (max id ${pre[0].maxid}), ` +
      `keyset walk from id>${START} (batch=${BATCH}, sleep=${SLEEP_MS}ms)`,
  );

  const t0 = Date.now();
  let cursor = START;
  let scanned = 0;
  let hadLots = 0;
  let stripped = 0;
  let unsafe = 0;
  let batches = 0;
  const unsafeSamples = [];

  for (;;) {
    // Retry with backoff. Covers BOTH failure modes seen in practice: a deadlock
    // against live ingestion (transient, same connection) and a dropped connection
    // (needs a fresh one, which the Pool supplies automatically). Each batch is its
    // own transaction, so a retry can never double-apply — already-stripped rows no
    // longer match `raw_json ? 'lots'`.
    let res;
    for (let attempt = 1; ; attempt++) {
      try {
        res = await client.query(BATCH_SQL(!CHECK_ONLY), [cursor, BATCH]);
        break;
      } catch (err) {
        if (attempt >= 6) {
          console.error(
            `\n\nBatch at cursor ${cursor} failed ${attempt}x — giving up.\n` +
              `Resume with:  node --env-file-if-exists=../../.env backfill-strip-car-lots.mjs --start=${cursor}\n`,
          );
          throw err;
        }
        const wait = Math.min(30_000, 2000 * 2 ** (attempt - 1));
        console.warn(`\n  batch at cursor ${cursor} failed (${err.message}); retry ${attempt}/5 in ${wait}ms…`);
        await sleep(wait);
      }
    }

    const r = res.rows[0];
    if (Number(r.scanned) === 0) break;

    scanned += Number(r.scanned);
    hadLots += Number(r.had_lots);
    stripped += Number(r.stripped);
    unsafe += Number(r.unsafe);
    batches += 1;

    if (Number(r.unsafe) > 0 && unsafeSamples.length < 20) {
      const s = await client.query(
        `SELECT b.id FROM cars b WHERE b.id > $1 AND b.id <= $2 AND b.raw_json ? 'lots' LIMIT 20`,
        [cursor, r.cursor],
      );
      for (const row of s.rows) if (unsafeSamples.length < 20) unsafeSamples.push(row.id);
    }

    cursor = Number(r.cursor);
    // Newline every 25 batches so a crashed run still leaves a readable resume
    // cursor in the log instead of one giant \r-overwritten line.
    process.stdout.write(
      `${batches % 25 === 0 ? "\n" : "\r"}  scanned ${scanned}  had_lots ${hadLots}  stripped ${stripped}  ` +
        `UNSAFE ${unsafe}  (cursor ${cursor}, ${Math.round((Date.now() - t0) / 1000)}s)   `,
    );
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  console.log(
    `\n\nDone in ${Math.round((Date.now() - t0) / 1000)}s over ${batches} batches.\n` +
      `  scanned:  ${scanned}\n` +
      `  had lots: ${hadLots}\n` +
      `  ${CHECK_ONLY ? "would strip" : "stripped"}: ${stripped}\n` +
      `  UNSAFE (left untouched): ${unsafe}`,
  );
  if (unsafe > 0) {
    console.log(
      `\n  ${unsafe} car(s) had an embedded lot that is NOT recoverable from auction_lots\n` +
        `  and were deliberately left alone. Sample ids: ${unsafeSamples.join(", ")}\n` +
        `  Investigate before forcing anything — this is the data-loss guard doing its job.`,
    );
  }
  if (!CHECK_ONLY && stripped > 0) {
    console.log(
      `\n  Next: reclaim the dead space (autovacuum will also get there on its own,\n` +
        `  migration 0042 lowered the trigger):\n    VACUUM (ANALYZE) cars;`,
    );
  }
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nBackfill failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
