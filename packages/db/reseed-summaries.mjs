/**
 * Reseed / audit the catalog summary tables (car_listing_counts + car_listing_facets).
 *
 * Why this exists
 * ---------------
 * The summaries are maintained INCREMENTALLY by the recompute_*_counted wrappers via
 * a before/after snapshot-diff (migrations 0016/0017), serialized by an advisory lock
 * (migration 0026) so concurrent recomputes of the same cars can't race — under
 * normal AND bulk operation the summaries stay exactly consistent with the
 * projections. What the incremental path still CANNOT do is retro-fix existing rows
 * after you DELIBERATELY change a recompute_* function: that migration is
 * function-only (it doesn't touch existing rows), and re-running recompute on an
 * already-written row yields before == after ⇒ delta 0. So after a recompute_* logic
 * change (e.g. 0022) you re-derive the summaries from scratch — exactly the one-time
 * seed 0016/0017 ran at migration time — which is what this script does. Use --check
 * anytime as a cheap drift / negative-n assertion (e.g. in CI).
 *
 * It re-derives from the SAME key helpers the incremental path uses
 * (listing_count_keys / listing_facet_keys — the latter's current 9-arg 'fuel'
 * signature from 0020), so a reseed and the incremental maintenance can never disagree
 * about bucketing.
 *
 * Safety
 * ------
 * Each table is reseeded in ONE transaction (TRUNCATE + re-aggregate). TRUNCATE takes
 * an ACCESS EXCLUSIVE lock, so concurrent getCarsCount/getCarFacets reads BLOCK until
 * commit rather than ever observing an empty table — run it in a low-traffic window
 * (e.g. alongside the weekly drift sweep) anyway, since the facet re-aggregate scans
 * the full projection (~seconds).
 *
 * Usage (NEON_DATABASE_URL auto-loaded from repo-root .env):
 *   node --env-file-if-exists=../../.env reseed-summaries.mjs            # reseed both
 *   node --env-file-if-exists=../../.env reseed-summaries.mjs --check    # report only
 *   node --env-file-if-exists=../../.env reseed-summaries.mjs --counts   # counts only
 *   node --env-file-if-exists=../../.env reseed-summaries.mjs --facets   # facets only
 */
import pg from "pg";

const CHECK_ONLY = process.argv.includes("--check");
const ONLY_COUNTS = process.argv.includes("--counts");
const ONLY_FACETS = process.argv.includes("--facets");
const doCounts = !ONLY_FACETS;
const doFacets = !ONLY_COUNTS;

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

const client = new pg.Client({ connectionString: clean, ssl: { rejectUnauthorized: true } });

/**
 * Drift report (read-only): negative counters (should never exist — apply_*_delta
 * has no >= 0 guard) and the top-level total vs a live COUNT of the projection.
 */
async function check() {
  const negCounts = await client.query("SELECT count(*)::int AS n FROM car_listing_counts WHERE n < 0");
  const negFacets = await client.query("SELECT count(*)::int AS n FROM car_listing_facets WHERE n < 0");
  console.log(`negative n — car_listing_counts: ${negCounts.rows[0].n}, car_listing_facets: ${negFacets.rows[0].n}`);

  for (const [kind, table] of [
    ["active", "car_listings"],
    ["past", "car_listings_archived"],
  ]) {
    const summary = await client.query(
      "SELECT COALESCE(n, 0)::bigint AS n FROM car_listing_counts WHERE table_kind=$1 AND dim='total' AND val=''",
      [kind],
    );
    const live = await client.query(`SELECT count(*)::bigint AS n FROM ${table}`);
    const s = Number(summary.rows[0]?.n ?? 0);
    const l = Number(live.rows[0].n);
    const flag = s === l ? "OK" : `DRIFT (Δ ${s - l})`;
    console.log(`total[${kind}] — summary=${s} live=${l} → ${flag}`);
  }
}

async function reseedCounts() {
  await client.query("BEGIN");
  try {
    await client.query("TRUNCATE car_listing_counts");
    await client.query(`
      INSERT INTO car_listing_counts (table_kind, dim, val, n)
      SELECT 'active', k.dim, k.val, count(*)::bigint
      FROM car_listings cl
      CROSS JOIN LATERAL listing_count_keys(cl.location_country, cl.buy_now, cl.effective_price) k
      GROUP BY k.dim, k.val
      ON CONFLICT (table_kind, dim, val) DO UPDATE SET n = EXCLUDED.n`);
    await client.query(`
      INSERT INTO car_listing_counts (table_kind, dim, val, n)
      SELECT 'past', k.dim, k.val, count(*)::bigint
      FROM car_listings_archived cl
      CROSS JOIN LATERAL listing_count_keys(cl.location_country, cl.buy_now, cl.effective_price) k
      GROUP BY k.dim, k.val
      ON CONFLICT (table_kind, dim, val) DO UPDATE SET n = EXCLUDED.n`);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
  const { rows } = await client.query("SELECT count(*)::int AS n FROM car_listing_counts");
  console.log(`car_listing_counts reseeded — ${rows[0].n} rows`);
}

async function reseedFacets() {
  await client.query("BEGIN");
  try {
    await client.query("TRUNCATE car_listing_facets");
    // 9-arg listing_facet_keys (fuel added in 0020); mirrors 0017's seed + fuel.
    await client.query(`
      INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
      SELECT 'active', k.dim, k.val, k.val2, count(*)::bigint
      FROM car_listings cl
      CROSS JOIN LATERAL listing_facet_keys(
        cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
        cl.condition, cl.car_year, cl.vehicle_type, cl.body_type, cl.fuel_type) k
      GROUP BY k.dim, k.val, k.val2
      ON CONFLICT (table_kind, dim, val, val2) DO UPDATE SET n = EXCLUDED.n`);
    await client.query(`
      INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
      SELECT 'past', k.dim, k.val, k.val2, count(*)::bigint
      FROM car_listings_archived cl
      CROSS JOIN LATERAL listing_facet_keys(
        cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
        cl.condition, cl.car_year, cl.vehicle_type, cl.body_type, cl.fuel_type) k
      GROUP BY k.dim, k.val, k.val2
      ON CONFLICT (table_kind, dim, val, val2) DO UPDATE SET n = EXCLUDED.n`);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
  const { rows } = await client.query("SELECT count(*)::int AS n FROM car_listing_facets");
  console.log(`car_listing_facets reseeded — ${rows[0].n} rows`);
}

async function main() {
  await client.connect();
  // The facet re-aggregate scans the full projection; give it room like the backfill.
  await client.query("SET statement_timeout = 300000");

  if (CHECK_ONLY) {
    console.log("Drift report (read-only):");
    await check();
    return;
  }

  const t0 = Date.now();
  console.log("Reseeding summaries from the current projection state…");
  if (doCounts) await reseedCounts();
  if (doFacets) await reseedFacets();
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s. Post-reseed drift report:`);
  await check();
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nReseed failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
