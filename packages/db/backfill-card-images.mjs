/**
 * One-time backfill: populate auction_lots.thumbnail_url with the per-source card
 * image URL (served DIRECTLY from the source CDN — no baking). Mirrors the logic
 * in functions/shared/normalize.ts cardImageUrl(), but does the extraction
 * SERVER-SIDE (raw_json never leaves Neon) in id-keyset batches:
 *   - copart: raw_json->images->small[0]  (a ready _thb thumbnail)
 *   - iaai:   raw_json->images->normal[0]  resizer URL, width/height → 500/375
 *   - encar (+ anything else): image_url (the reliable i.auctionsapi.com copy)
 *
 * After this, reseed the projections so car_listings.thumbnail_url picks it up:
 *   node --env-file-if-exists=../../.env backfill-car-listings.mjs
 *   node --env-file-if-exists=../../.env backfill-car-listings.mjs --fn=recompute_archived_car_listings
 *
 * Idempotent + resumable (--start=<id>). Only NEON_DATABASE_URL is needed.
 */
import pg from "pg";

const numArg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const BATCH = numArg("batch", 20000);
const START = numArg("start", 0);
const SLEEP_MS = numArg("sleep", 50);

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

// Server-side CASE — MUST match functions/shared/normalize.ts cardImageUrl().
const CARD_URL_SQL = `CASE
  WHEN domain_name = 'copart_com' AND (raw_json->'images'->'small'->>0) IS NOT NULL
    THEN raw_json->'images'->'small'->>0
  WHEN domain_name = 'iaai_com' AND (raw_json->'images'->'normal'->>0) IS NOT NULL
    THEN regexp_replace(
           regexp_replace(raw_json->'images'->'normal'->>0, '([?&]width=)[0-9]+',  '\\1500'),
           '([?&]height=)[0-9]+', '\\1375')
  ELSE image_url
END`;

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 300000");

  const { rows: cnt } = await client.query(
    "SELECT count(*)::int AS n FROM auction_lots WHERE image_url IS NOT NULL",
  );
  console.log(`Backfilling card image URLs (server-side): ${cnt[0].n} lots (batch=${BATCH})`);

  const t0 = Date.now();
  let cursor = START;
  let updated = 0;
  for (;;) {
    const res = await client.query(
      `SELECT id FROM auction_lots WHERE id > $1 AND image_url IS NOT NULL ORDER BY id ASC LIMIT $2`,
      [cursor, BATCH],
    );
    if (res.rows.length === 0) break;
    const ids = res.rows.map((r) => r.id);
    cursor = ids[ids.length - 1];
    const upd = await client.query(
      `UPDATE auction_lots SET thumbnail_url = ${CARD_URL_SQL}
        WHERE id = ANY($1::bigint[]) AND thumbnail_url IS DISTINCT FROM (${CARD_URL_SQL})`,
      [ids],
    );
    updated += upd.rowCount ?? 0;
    process.stdout.write(`\r  up to id ${cursor}, updated ${updated}  (${Math.round((Date.now() - t0) / 1000)}s)   `);
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }
  console.log(`\nDone. Updated ${updated} thumbnail_url values in ${Math.round((Date.now() - t0) / 1000)}s.`);
  console.log("Next: reseed — backfill-car-listings.mjs (active) + --fn=recompute_archived_car_listings.");
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nCard-image backfill failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
