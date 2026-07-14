/**
 * One-time backfill for the `fuel_type` column added to the catalog projections
 * by migration 0020 (car_listings + car_listings_archived), plus the initial
 * seed of the 'fuel' facet dimension in car_listing_facets.
 *
 * WHY a dedicated script (not the inline migration): a single joined
 * `UPDATE … FROM cars` over the whole ~935k-active + ~400k-past projection
 * exceeds the pooled endpoint's transaction/statement limit (the inline version
 * was canceled + rolled back). So we chunk it: a keyset walk over car_id, each
 * batch its own statement, exactly like backfill-car-listings.mjs. `fuel_type` is
 * copied straight from cars (a stable column the reference sync never touches), so
 * this is a plain column fill — far cheaper than re-running the recompute.
 *
 * Idempotent + resumable: each batch UPDATEs only rows whose fuel_type differs, and
 * --start resumes from a car-id checkpoint. Safe to run against prod while ingestion
 * runs (new rows already get fuel_type from the redefined recompute in 0020; this
 * only fills the pre-existing ones). The facet re-seed at the end is a DELETE+INSERT
 * of just dim='fuel', run once after the columns are filled.
 *
 * Usage (NEON_DATABASE_URL auto-loaded from repo-root .env):
 *   node --env-file-if-exists=../../.env backfill-fuel-type.mjs
 *   node --env-file-if-exists=../../.env backfill-fuel-type.mjs --batch=25000 --start=0 --sleep=25
 *   node --env-file-if-exists=../../.env backfill-fuel-type.mjs --facets-only   # just re-seed the facet
 *
 * Flags:
 *   --batch=N       car-id window per UPDATE (default 25000)
 *   --start=N       resume from this car id (default 0)
 *   --sleep=MS      pause between batches (default 25)
 *   --facets-only   skip the column backfill; only (re)seed the 'fuel' facet rows
 */
import pg from "pg";

const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const BATCH = arg("batch", 25000);
const SLEEP_MS = arg("sleep", 25);
const START = arg("start", 0);
const FACETS_ONLY = process.argv.includes("--facets-only");

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

/**
 * Keyset-walk one projection table, copying cars.fuel_type into it in car-id
 * windows. Mirrors backfill-car-listings.mjs's cursor loop. Returns rows touched.
 */
async function backfillTable(table) {
  const { rows: mx } = await client.query("SELECT COALESCE(MAX(car_id),0) AS maxid FROM " + table);
  console.log(`\n${table}: filling fuel_type from cars (max car_id ${mx[0].maxid}, batch=${BATCH}, sleep=${SLEEP_MS}ms)`);

  const t0 = Date.now();
  let cursor = START;
  let touched = 0;
  let batches = 0;
  for (;;) {
    // Pull the next window of car_ids present in THIS projection (sparse ids), then
    // fill only that window — a bounded index nested-loop over cars(id) PK.
    const ids = await client.query(
      `SELECT car_id FROM ${table} WHERE car_id > $1 ORDER BY car_id ASC LIMIT $2`,
      [cursor, BATCH],
    );
    if (ids.rows.length === 0) break;
    const arr = ids.rows.map((r) => r.car_id);
    const res = await client.query(
      `UPDATE ${table} cl SET fuel_type = c.fuel_type
         FROM cars c
        WHERE c.id = cl.car_id
          AND cl.car_id = ANY($1::int[])
          AND cl.fuel_type IS DISTINCT FROM c.fuel_type`,
      [arr],
    );
    cursor = arr[arr.length - 1];
    touched += res.rowCount;
    batches += 1;
    process.stdout.write(
      `\r  window up to car_id ${cursor} — rows updated so far: ${touched} (${batches} batches, ${Math.round((Date.now() - t0) / 1000)}s)   `,
    );
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }
  console.log(`\n  ${table}: done — ${touched} rows updated over ${batches} batches in ${Math.round((Date.now() - t0) / 1000)}s`);
}

/**
 * (Re)seed the 'fuel' facet rows for both table_kinds from the now-filled columns.
 * DELETE+INSERT of dim='fuel' ONLY (leaves every other dimension untouched), so it's
 * safe to re-run. These are cheap grouped aggregates (≤ ~10 distinct fuel values).
 */
async function seedFuelFacets() {
  console.log("\nSeeding car_listing_facets dim='fuel' …");
  await client.query("DELETE FROM car_listing_facets WHERE dim = 'fuel'");
  await client.query(`
    INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
    SELECT 'active', 'fuel', fuel_type, '', count(*)::bigint
      FROM car_listings WHERE fuel_type IS NOT NULL GROUP BY fuel_type
    ON CONFLICT (table_kind, dim, val, val2) DO UPDATE SET n = EXCLUDED.n`);
  await client.query(`
    INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
    SELECT 'past', 'fuel', fuel_type, '', count(*)::bigint
      FROM car_listings_archived WHERE fuel_type IS NOT NULL GROUP BY fuel_type
    ON CONFLICT (table_kind, dim, val, val2) DO UPDATE SET n = EXCLUDED.n`);
  const { rows } = await client.query(
    "SELECT table_kind, val, n FROM car_listing_facets WHERE dim='fuel' ORDER BY table_kind, n DESC",
  );
  console.table(rows);
}

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 120000");

  if (!FACETS_ONLY) {
    await backfillTable("car_listings");
    await backfillTable("car_listings_archived");
  }
  await seedFuelFacets();
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nBackfill failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
