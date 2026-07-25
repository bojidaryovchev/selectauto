/**
 * One-time backfill: populate auction_lots.thumbnail_url with the per-source card
 * image URL (served DIRECTLY from the source CDN — no baking). Mirrors the exact
 * logic now in functions/shared/normalize.ts cardImageUrl(), applied to existing
 * rows from their raw_json. Keyset-walks by id in batches and bulk-UPDATEs.
 *
 * After this, run the projection reseed so car_listings.thumbnail_url picks up the
 * new values:
 *   node --env-file-if-exists=../../.env backfill-car-listings.mjs
 *   node --env-file-if-exists=../../.env backfill-car-listings.mjs --fn=recompute_archived_car_listings
 *
 * Idempotent + resumable (--start=<id>). Only NEON_DATABASE_URL is needed.
 *
 * Usage:
 *   node --env-file-if-exists=../../.env backfill-card-images.mjs
 *   node --env-file-if-exists=../../.env backfill-card-images.mjs --batch=5000 --start=0
 */
import pg from "pg";

const numArg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const BATCH = numArg("batch", 5000);
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

/**
 * The card image URL — MUST match functions/shared/normalize.ts cardImageUrl().
 *   - copart: images.small[0] (a ready _thb thumbnail).
 *   - iaai:   images.normal[0] resizer URL, width/height rewritten to card size.
 *   - encar (+ anything else): the reliable i.auctionsapi.com copy (= image_url).
 */
function cardImageUrl(domainName, rawJson, fallback) {
  const imgs = rawJson && typeof rawJson === "object" ? rawJson.images : null;
  if (imgs && typeof imgs === "object") {
    if (domainName === "copart_com") {
      const small = Array.isArray(imgs.small) ? imgs.small : [];
      if (small.length > 0 && typeof small[0] === "string") return small[0];
    } else if (domainName === "iaai_com") {
      const normal = Array.isArray(imgs.normal) ? imgs.normal : [];
      if (normal.length > 0 && typeof normal[0] === "string") {
        return normal[0]
          .replace(/([?&]width=)\d+/, (_m, p) => `${p}500`)
          .replace(/([?&]height=)\d+/, (_m, p) => `${p}375`);
      }
    }
  }
  return fallback;
}

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 120000");

  const { rows: cnt } = await client.query(
    "SELECT count(*)::int AS n FROM auction_lots WHERE image_url IS NOT NULL",
  );
  console.log(`Backfilling card image URLs: ${cnt[0].n} lots (batch=${BATCH})`);

  const t0 = Date.now();
  let cursor = START;
  let updated = 0;
  for (;;) {
    const res = await client.query(
      `SELECT id, domain_name, image_url, raw_json
         FROM auction_lots
        WHERE id > $1 AND image_url IS NOT NULL
        ORDER BY id ASC LIMIT $2`,
      [cursor, BATCH],
    );
    if (res.rows.length === 0) break;
    cursor = res.rows[res.rows.length - 1].id;

    // Build parallel arrays for a single set-based UPDATE ... FROM unnest().
    const ids = [];
    const urls = [];
    for (const r of res.rows) {
      const url = cardImageUrl(r.domain_name, r.raw_json, r.image_url);
      ids.push(r.id);
      urls.push(url);
    }
    const upd = await client.query(
      `UPDATE auction_lots AS al SET thumbnail_url = v.url
         FROM (SELECT unnest($1::bigint[]) AS id, unnest($2::text[]) AS url) AS v
        WHERE al.id = v.id AND al.thumbnail_url IS DISTINCT FROM v.url`,
      [ids, urls],
    );
    updated += upd.rowCount ?? 0;
    process.stdout.write(`\r  scanned up to id ${cursor}, updated ${updated}  (${Math.round((Date.now() - t0) / 1000)}s)   `);
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }
  console.log(`\nDone. Updated ${updated} thumbnail_url values in ${Math.round((Date.now() - t0) / 1000)}s.`);
  console.log("Next: reseed projections — backfill-car-listings.mjs (active) + --fn=recompute_archived_car_listings.");
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nCard-image backfill failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
