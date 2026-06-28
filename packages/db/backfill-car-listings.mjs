/**
 * One-time backfill for the car_listings projection table.
 *
 * Calls recompute_car_listings(car_ids[]) (migration 0007 — the SAME function
 * ingestion uses, so the pick-strategy can't drift) over EVERY car id, in
 * batches by id range. Each batch is its own statement/transaction, so the long
 * load is interruptible and resumable: re-running is an idempotent upsert, and
 * --start lets you resume from a checkpoint.
 *
 * Write-isolated to car_listings; only READS cars/auction_lots. Safe to run
 * against prod while ingestion runs (recompute is idempotent + order-independent).
 *
 * Usage (NEON_DATABASE_URL auto-loaded from repo-root .env):
 *   node --env-file-if-exists=../../.env backfill-car-listings.mjs
 *   node --env-file-if-exists=../../.env backfill-car-listings.mjs --batch=25000 --start=0 --sleep=50
 *
 * Flags:
 *   --batch=N   car-id range width per recompute call (default 25000)
 *   --start=N   resume from this car id (default 0)
 *   --sleep=MS  pause between batches to spare the DB/ingestion (default 25)
 */
import pg from "pg";

const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const BATCH = arg("batch", 25000);
const SLEEP_MS = arg("sleep", 25);
let START = arg("start", 0);
// Which recompute function to call: the active table (default) or the archived one.
const fnHit = process.argv.find((a) => a.startsWith("--fn="));
const FN = fnHit ? fnHit.split("=")[1] : "recompute_car_listings";
const TABLE = FN === "recompute_archived_car_listings" ? "car_listings_archived" : "car_listings";
if (!["recompute_car_listings", "recompute_archived_car_listings"].includes(FN)) {
  console.error(`Unknown --fn=${FN}`);
  process.exit(1);
}

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

const client = new pg.Client({ connectionString: clean, ssl: { rejectUnauthorized: true } });

async function main() {
  await client.connect();
  // Give big range-scans room; the per-batch recompute is fast but the first
  // touch of a cold id range can take a few seconds.
  await client.query("SET statement_timeout = 120000");

  const { rows } = await client.query("SELECT count(*)::int AS total, COALESCE(MAX(id),0) AS maxid FROM cars");
  console.log(
    `Backfilling ${TABLE} via ${FN}() — ${rows[0].total} cars (max id ${rows[0].maxid}), keyset walk from id>${START} (batch=${BATCH}, sleep=${SLEEP_MS}ms)`,
  );

  // Keyset walk over actual car ids (cars.id is sparse — id-range stepping would
  // waste thousands of empty batches). Fetch the next BATCH ids > cursor, recompute
  // them in one set-based call, advance the cursor to the last id seen.
  const t0 = Date.now();
  let cursor = START;
  let batches = 0;
  let processed = 0;
  for (;;) {
    const ids = await client.query("SELECT id FROM cars WHERE id > $1 ORDER BY id ASC LIMIT $2", [cursor, BATCH]);
    if (ids.rows.length === 0) break;
    const arr = ids.rows.map((r) => r.id);
    await client.query(`SELECT ${FN}($1::int[])`, [arr]);
    cursor = arr[arr.length - 1];
    processed += arr.length;
    batches += 1;
    const cnt = await client.query(`SELECT count(*)::int AS n FROM ${TABLE}`);
    process.stdout.write(
      `\r  processed ${processed} cars (cursor id ${cursor})  car_listings_total=${cnt.rows[0].n}  (${Math.round((Date.now() - t0) / 1000)}s)   `,
    );
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  const final = await client.query(`SELECT count(*)::int AS n FROM ${TABLE}`);
  console.log(
    `\nDone. ${processed} cars over ${batches} batches in ${Math.round((Date.now() - t0) / 1000)}s. ${TABLE} rows: ${final.rows[0].n}`,
  );
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nBackfill failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
