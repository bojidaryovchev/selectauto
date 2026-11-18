/**
 * One-time repair after migration 0052: move cars whose ACTIVE row is a concluded
 * lot ('sold', 'not_sold', 'failed') to the past view.
 *
 * 0052 changes the recompute functions only; a projection row is rewritten when
 * its car is next recomputed. Ingestion recomputes the cars it touches, and the
 * weekly drift sweep every car — but the lots this is about stopped changing
 * upstream, so most would wait for Sunday. This script recomputes them now.
 *
 * WHICH CARS. car_listings rows whose status is concluded. The active projection
 * prefers an open lot, so such a row means the car has no open lot: under 0052 it
 * leaves car_listings and enters car_listings_archived.
 *
 * WHAT IT WRITES, per batch, in ONE transaction: both *_counted recompute wrappers
 * for the batch's cars, so car_listings, car_listings_archived and the count/facet
 * summaries move together (the wrappers serialize with ingestion through their
 * advisory lock, migration 0026). No source table is written. Idempotent: a car
 * already moved is no longer selected. Resumable: keyset on car_id.
 *
 * Apply 0052 FIRST (`pnpm migrate`): with the old functions this script changes
 * nothing.
 *
 * Usage (from packages/db/; NEON_DATABASE_URL auto-loaded from the repo-root .env):
 *   node --env-file-if-exists=../../.env repair-concluded-active.mjs --dry-run   # read-only count
 *   node --env-file-if-exists=../../.env repair-concluded-active.mjs
 *   node --env-file-if-exists=../../.env repair-concluded-active.mjs --start=<car id> --batch=5000 --sleep=50
 *
 * Flags:
 *   --dry-run   count what would move; READ ONLY, writes nothing
 *   --batch=N   cars per batch (default 5000)
 *   --start=N   resume after this car_id (default 0)
 *   --sleep=MS  pause between batches to spare the DB and ingestion (default 50)
 */
import pg from "pg";

const numArg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const BATCH = numArg("batch", 5000);
const START = numArg("start", 0);
const SLEEP_MS = numArg("sleep", 50);
const DRY_RUN = process.argv.includes("--dry-run");

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("NEON_DATABASE_URL is not set (repo-root .env auto-loads via --env-file-if-exists).");
  process.exit(1);
}
const clean = (() => {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return connectionString;
  }
})();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new pg.Client({ connectionString: clean, ssl: { rejectUnauthorized: true } });

const CONCLUDED = "('sold','not_sold','failed')";

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 300000");

  if (DRY_RUN) {
    await client.query("BEGIN READ ONLY");
    const r = await client.query(
      `SELECT domain_name, status, count(*)::int AS n FROM car_listings WHERE status IN ${CONCLUDED} GROUP BY 1, 2 ORDER BY 3 DESC`,
    );
    await client.query("ROLLBACK");
    const total = r.rows.reduce((s, x) => s + x.n, 0);
    console.log(`DRY RUN (read-only): ${total} cars would move to the past view.`);
    for (const x of r.rows) console.log(`  ${x.domain_name} ${x.status}: ${x.n}`);
    return;
  }

  console.log(`Moving concluded active cars to the past view (batch=${BATCH}, start after car ${START}, sleep=${SLEEP_MS}ms)`);
  const t0 = Date.now();
  let cursor = START;
  let moved = 0;
  for (;;) {
    const win = await client.query(
      `SELECT car_id FROM car_listings WHERE car_id > $1 AND status IN ${CONCLUDED} ORDER BY car_id ASC LIMIT $2`,
      [cursor, BATCH],
    );
    if (win.rows.length === 0) break;
    const ids = win.rows.map((r) => r.car_id);

    await client.query("BEGIN");
    try {
      await client.query("SELECT recompute_car_listings_counted($1::int[])", [ids]);
      await client.query("SELECT recompute_archived_car_listings_counted($1::int[])", [ids]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw new Error(`batch after car ${cursor} failed (resume with --start=${cursor}): ${err.message}`);
    }

    cursor = ids[ids.length - 1];
    moved += ids.length;
    process.stdout.write(`\r  recomputed ${moved} cars (cursor car ${cursor}, ${Math.round((Date.now() - t0) / 1000)}s)   `);
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  const left = await client.query(`SELECT count(*)::int AS n FROM car_listings WHERE status IN ${CONCLUDED}`);
  console.log(
    `\nDone in ${Math.round((Date.now() - t0) / 1000)}s: ${moved} cars recomputed; ${left.rows[0].n} concluded rows left in car_listings.`,
  );
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nConcluded-lot repair failed:", err.message ?? err);
    await client.end().catch(() => {});
    process.exit(1);
  });
