/**
 * One-time repair: take re-run lots back OUT of the archive.
 *
 * Until 2026-10 the active upsert (functions/shared/db.ts) kept a lot's stored
 * `archived` flag whenever the /cars payload carried no `archived` boolean — and
 * /cars never carries one, because it only lists ACTIVE lots (vendor contract:
 * `archived` / `archived_at` are present ONLY on an archived lot). A lot that runs
 * again after being archived (same lot number, new sale date) therefore stayed
 * archived=true for good and its car vanished from both projections. The fixed
 * upsert un-archives such a lot the next time /cars delivers it; this script does
 * the same NOW for rows whose last /cars delivery predates the fix.
 *
 * WHICH ROWS. archived = true AND the stored payload is /cars-shaped (a lot object,
 * not the archive feed's flat record — that one carries `lot_id`) AND it does not
 * say `archived: true`. archiveLots overwrites raw_json with the flat record every
 * time it (re-)archives a lot, so a /cars-shaped payload on an archived row means
 * /cars delivered the lot AFTER its last archive — i.e. upstream had it active
 * again. Status is deliberately ignored, exactly as the fixed upsert ignores it.
 *
 * WHAT IT WRITES, per batch, in ONE transaction: archived = false, archived_at =
 * NULL (as the fixed upsert does — a later re-archive must get a fresh timestamp,
 * which the 90-day 410 rule reads), updated_at = now(); then BOTH *_counted
 * recompute wrappers for the affected cars, so car_listings, car_listings_archived
 * and the count/facet summaries move together. Idempotent + resumable.
 *
 * Deploy the fixed functions FIRST (`pnpm run deploy`): with the old code still
 * running, every lot that re-runs in the meantime gets stuck again.
 *
 * Usage (from packages/db/; NEON_DATABASE_URL auto-loaded from the repo-root .env):
 *   node --env-file-if-exists=../../.env repair-rerun-lots.mjs --dry-run   # read-only count
 *   node --env-file-if-exists=../../.env repair-rerun-lots.mjs
 *   node --env-file-if-exists=../../.env repair-rerun-lots.mjs --start=<lot id> --batch=20000 --sleep=50
 *
 * Flags:
 *   --dry-run   count what would change; READ ONLY transaction, writes nothing
 *   --batch=N   archived lots examined per batch (default 20000)
 *   --start=N   resume after this auction_lots.id (default 0)
 *   --sleep=MS  pause between batches to spare the DB/ingestion (default 50)
 */
import pg from "pg";

const numArg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const BATCH = numArg("batch", 20000);
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

// A stuck re-run lot: archived, but /cars delivered it after its last archive.
// `raw_json ? 'lot_id'` identifies the archive feed's flat record (docs/01 §6b).
const STUCK = `al.archived = true
    AND NOT (al.raw_json ? 'lot_id')
    AND al.raw_json->'archived' IS DISTINCT FROM 'true'::jsonb`;

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 300000");
  console.log(
    `${DRY_RUN ? "DRY RUN (read-only) — " : ""}Repairing re-run lots stuck archived (batch=${BATCH}, start after id ${START}, sleep=${SLEEP_MS}ms)`,
  );

  const t0 = Date.now();
  let cursor = START;
  let examined = 0;
  let fixed = 0;
  // A car's lots can land in different batches, so count distinct cars globally.
  const cars = new Set();
  const byDomain = {};
  for (;;) {
    // Next window of ARCHIVED lot ids — keyset on the PK, so a resume is exact.
    const win = await client.query(
      "SELECT id FROM auction_lots WHERE id > $1 AND archived = true ORDER BY id ASC LIMIT $2",
      [cursor, BATCH],
    );
    if (win.rows.length === 0) break;
    const ids = win.rows.map((r) => r.id);
    const last = ids[ids.length - 1];

    await client.query(DRY_RUN ? "BEGIN READ ONLY" : "BEGIN");
    try {
      const res = DRY_RUN
        ? await client.query(
            `SELECT al.car_id, al.domain_name FROM auction_lots al WHERE al.id = ANY($1::int[]) AND ${STUCK}`,
            [ids],
          )
        : await client.query(
            `UPDATE auction_lots al SET archived = false, archived_at = NULL, updated_at = now()
              WHERE al.id = ANY($1::int[]) AND ${STUCK}
              RETURNING al.car_id, al.domain_name`,
            [ids],
          );
      const carIds = [...new Set(res.rows.map((r) => r.car_id).filter((id) => Number.isInteger(id)))];
      if (!DRY_RUN && carIds.length > 0) {
        await client.query("SELECT recompute_car_listings_counted($1::int[])", [carIds]);
        await client.query("SELECT recompute_archived_car_listings_counted($1::int[])", [carIds]);
      }
      await client.query(DRY_RUN ? "ROLLBACK" : "COMMIT");
      for (const r of res.rows) byDomain[r.domain_name] = (byDomain[r.domain_name] ?? 0) + 1;
      fixed += res.rows.length;
      for (const id of carIds) cars.add(id);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw new Error(`batch after id ${cursor} failed (resume with --start=${cursor}): ${err.message}`);
    }

    cursor = last;
    examined += ids.length;
    process.stdout.write(
      `\r  examined ${examined} archived lots (cursor id ${cursor}), ${DRY_RUN ? "would fix" : "fixed"} ${fixed} lots on ${cars.size} cars  (${Math.round((Date.now() - t0) / 1000)}s)   `,
    );
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }
  console.log(
    `\nDone in ${Math.round((Date.now() - t0) / 1000)}s. ${DRY_RUN ? "Would un-archive" : "Un-archived"} ${fixed} lots (${JSON.stringify(byDomain)}) on ${cars.size} cars${DRY_RUN ? "; nothing was written." : "; both projections recomputed for them."}`,
  );
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nRe-run lot repair failed:", err.message ?? err);
    await client.end().catch(() => {});
    process.exit(1);
  });
