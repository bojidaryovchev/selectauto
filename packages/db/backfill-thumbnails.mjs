/**
 * One-time backfill: enqueue a thumbnail (re)bake for every un-baked auction lot.
 *
 * Keyset-walks auction_lots WHERE thumbnail_url IS NULL AND image_url IS NOT NULL
 * (the partial index auction_lots_thumbnail_missing_idx from migration 0035 makes
 * this cheap) and SendMessageBatch-es {lotId} to the bake queue. The bakeThumbnail
 * worker drains it, resizes each source image, uploads the WebP, and fills
 * thumbnail_url. Cards fall back to the raw optimized image until each lands, so
 * this is fully non-blocking and safe to run against prod while ingestion runs.
 *
 * Idempotent + resumable: the worker skips lots already baked from the current
 * source, and --start resumes from a cursor. Re-running only re-enqueues lots
 * still NULL.
 *
 * Prereqs: NEON_DATABASE_URL (repo-root .env) + AWS creds (AWS_PROFILE/region, as
 * for `pulumi up`) + the bake queue URL (BAKE_QUEUE_URL env or --queue-url=...,
 * from the Pulumi output `bakeThumbnailQueueUrl`).
 *
 * Usage:
 *   BAKE_QUEUE_URL="https://sqs.eu-central-1.amazonaws.com/123/selectauto-prod-bake-thumbnail" \
 *     node --env-file-if-exists=../../.env backfill-thumbnails.mjs
 *   node --env-file-if-exists=../../.env backfill-thumbnails.mjs --queue-url=... --limit=100   # smoke test
 *
 * Flags:
 *   --queue-url=URL  bake queue URL (overrides BAKE_QUEUE_URL)
 *   --region=R       AWS region (else from AWS_REGION / profile)
 *   --batch=N        lot ids fetched per DB page (default 5000)
 *   --start=N        resume from this auction_lots.id (default 0)
 *   --sleep=MS       pause between pages (default 100)
 *   --limit=N        stop after enqueuing ~N messages (default: no limit; for testing)
 */
import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import pg from "pg";

const numArg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : def;
};
const strArg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : def;
};

const BATCH = numArg("batch", 5000);
const SLEEP_MS = numArg("sleep", 100);
const START = numArg("start", 0);
const LIMIT = numArg("limit", Infinity);
const REGION = strArg("region", process.env.AWS_REGION);
const QUEUE_URL = strArg("queue-url", process.env.BAKE_QUEUE_URL);

if (!QUEUE_URL) {
  console.error("Bake queue URL is required: set BAKE_QUEUE_URL or pass --queue-url=... (Pulumi output bakeThumbnailQueueUrl).");
  process.exit(1);
}
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
    return connectionString.replace(/([?&])sslmode=[^&]*(&|$)/i, (_m, pre, post) => (post === "&" ? pre : ""));
  }
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new pg.Client({ connectionString: clean, ssl: { rejectUnauthorized: true } });
const sqs = new SQSClient(REGION ? { region: REGION } : {});

/** SendMessageBatch in chunks of 10 (the SQS max per call). */
async function enqueue(ids) {
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: chunk.map((lotId) => ({ Id: String(lotId), MessageBody: JSON.stringify({ lotId }) })),
      }),
    );
  }
}

async function main() {
  await client.connect();
  await client.query("SET statement_timeout = 120000");

  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM auction_lots WHERE thumbnail_url IS NULL AND image_url IS NOT NULL",
  );
  console.log(
    `Backfilling thumbnails: ${rows[0].n} un-baked lots → ${QUEUE_URL} (batch=${BATCH}, sleep=${SLEEP_MS}ms${LIMIT === Infinity ? "" : `, limit=${LIMIT}`})`,
  );

  const t0 = Date.now();
  let cursor = START;
  let enqueued = 0;
  for (;;) {
    const res = await client.query(
      `SELECT id FROM auction_lots
        WHERE id > $1 AND thumbnail_url IS NULL AND image_url IS NOT NULL
        ORDER BY id ASC LIMIT $2`,
      [cursor, BATCH],
    );
    if (res.rows.length === 0) break;
    let ids = res.rows.map((r) => r.id);
    cursor = ids[ids.length - 1];
    if (enqueued + ids.length > LIMIT) ids = ids.slice(0, LIMIT - enqueued);

    await enqueue(ids);
    enqueued += ids.length;
    process.stdout.write(`\r  enqueued ${enqueued} (cursor id ${cursor})  (${Math.round((Date.now() - t0) / 1000)}s)   `);

    if (enqueued >= LIMIT) break;
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  console.log(`\nDone. Enqueued ${enqueued} bake messages in ${Math.round((Date.now() - t0) / 1000)}s.`);
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error("\nThumbnail backfill failed:", err);
    await client.end().catch(() => {});
    process.exit(1);
  });
