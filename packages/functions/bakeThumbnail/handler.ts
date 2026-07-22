/**
 * Lambda: bakeThumbnail  (SQS drain worker)
 *
 * Bakes ONE small WebP card thumbnail per auction lot and uploads it to the
 * thumbnail S3 bucket (served via CloudFront). The Next.js catalog grid then
 * loads these directly with `<Image unoptimized>`, bypassing Vercel Image
 * Optimization entirely — the whole point of this project (image optimization
 * was ~80% of the Vercel bill; every card view was a billed MISS/STALE).
 *
 * WHY A SEPARATE WORKER (not inline in upsertCarsAndLots):
 *   - `sharp` is native and cannot be bundled into the single-file handler the
 *     sync uses; it ships via a Lambda layer here (see infra/src/lambdas.ts).
 *   - Baking fetches the SOURCE image CDN (i.auctionsapi.com, etc.), NOT the
 *     rate-limited AuctionsAPI /api, so it isn't bound by the 1 req/sec budget
 *     and can drain concurrently without starving ingestion.
 *
 * Enqueued by the ingestion upsert (shared/db.ts) whenever a lot's image_url is
 * new/changed, and by the one-off backfill (packages/db/backfill-thumbnails.mjs).
 * Message body (JSON): { "lotId": 12345 }
 *
 * CHANGE DETECTION: `auction_lots.thumbnail_source_url` records which image the
 * current thumbnail was baked from. image_url is overwritten on EVERY sync, so we
 * (re)bake only when it differs. Output keys are content-addressed
 * (`thumb/<sha256(image_url)>.webp`) → a changed source = a new key, so objects
 * are write-once and never need CDN invalidation.
 *
 * FAILURE MODES (broken source URL, sharp error, S3 failure) throw → SQS retry →
 * DLQ (maxReceiveCount 3). thumbnail_url simply stays NULL and the card falls
 * back to the raw optimized image, then to the placeholder — ingestion is never
 * blocked. batchSize 10 + ReportBatchItemFailures: one bad message doesn't fail
 * the batch.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { getPool } from "../shared/db.js";
import { Logger } from "../shared/logger.js";

// Card display is 400×260 (aspect ≈ 1.538). We bake TWO widths at that exact
// ratio and the web card serves them as a responsive srcset (…-640.webp /
// …-1280.webp) — desktop grid cells pick 640, high-DPI/full-width phones pick
// 1280 (crisp) — matching next/image's per-device behavior while staying off
// Vercel's optimizer. thumbnail_url stores the 640 URL; the card derives 1280.
const THUMB_SIZES = [
  { w: 640, h: 416, suffix: "640" },
  { w: 1280, h: 832, suffix: "1280" },
] as const;
const THUMB_QUALITY = 62;

const BUCKET = process.env.THUMBNAIL_BUCKET;
const CDN_BASE_URL = process.env.THUMBNAIL_CDN_BASE_URL; // e.g. https://d1234.cloudfront.net

// Module-scoped for warm-invocation reuse. Region is provided by the Lambda env.
const s3 = new S3Client({});

interface BakeMessage {
  lotId: number;
}

interface LotRow {
  image_url: string | null;
  thumbnail_url: string | null;
  thumbnail_source_url: string | null;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  if (!BUCKET || !CDN_BASE_URL) {
    // Misconfiguration — fail every message so nothing is silently dropped.
    throw new Error("THUMBNAIL_BUCKET and THUMBNAIL_CDN_BASE_URL must be set");
  }

  // Process the whole SQS batch CONCURRENTLY. Each bake is dominated by network
  // I/O (source fetch + 2× S3 upload) with only trivial single-row DB queries, so
  // running the batch in parallel — instead of one lot at a time — lets a single
  // Lambda slot drain `batchSize` images in ~one image-time rather than N × it.
  // Per-item failures are still reported individually (ReportBatchItemFailures) so
  // one bad message never fails its batch-mates.
  const results = await Promise.allSettled(
    event.Records.map(async (record) => {
      const log = new Logger({ flowType: "bake_thumbnail", messageId: record.messageId });
      const { lotId } = JSON.parse(record.body) as BakeMessage;
      if (!Number.isInteger(lotId)) throw new Error(`invalid lotId: ${record.body}`);
      await bakeOne(lotId, log);
    }),
  );

  const failures: { itemIdentifier: string }[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const record = event.Records[i];
      new Logger({ flowType: "bake_thumbnail", messageId: record.messageId }).error(
        "bake_thumbnail_message_failed",
        { error: (result.reason as Error)?.message ?? String(result.reason) },
      );
      failures.push({ itemIdentifier: record.messageId });
    }
  });

  return { batchItemFailures: failures };
};

async function bakeOne(lotId: number, log: Logger): Promise<void> {
  const db = getPool();

  const res = await db.query<LotRow>(
    `SELECT image_url, thumbnail_url, thumbnail_source_url FROM auction_lots WHERE id = $1`,
    [lotId],
  );
  const row = res.rows[0];

  // Lot gone (deleted between enqueue and processing) or has no source image.
  if (!row) {
    log.info("bake_skip_missing_lot", { lotId });
    return;
  }
  const src = row.image_url;
  if (!src) {
    log.info("bake_skip_no_image", { lotId });
    return;
  }

  // Idempotent: already baked from this exact source (SQS at-least-once redelivery,
  // or the sync + backfill both enqueued the same lot).
  if (row.thumbnail_url && row.thumbnail_source_url === src) {
    log.info("bake_skip_already_baked", { lotId });
    return;
  }

  // Content-addressed keys (a changed source → new hash → new keys, so objects are
  // write-once and never need CDN invalidation). thumbnail_url stores the 640 URL.
  const baseKey = `thumb/${createHash("sha256").update(src).digest("hex")}`;
  const cdnUrl = `${CDN_BASE_URL}/${baseKey}-640.webp`;

  // 1) Fetch the source ONCE, then 2) resize it to each width and 3) upload both.
  //    Objects are immutable (1yr cache) since keys are content-addressed.
  await log.time(
    "bake_fetch_resize",
    async () => {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`source fetch ${resp.status} for ${src}`);
      const input = Buffer.from(await resp.arrayBuffer());
      await Promise.all(
        THUMB_SIZES.map(async ({ w, h, suffix }) => {
          const webp = await sharp(input)
            .resize(w, h, { fit: "cover" })
            .webp({ quality: THUMB_QUALITY })
            .toBuffer();
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: `${baseKey}-${suffix}.webp`,
              Body: webp,
              ContentType: "image/webp",
              CacheControl: "public, max-age=31536000, immutable",
            }),
          );
        }),
      );
    },
    { lotId },
  );

  // 4) Write back. The `image_url = $2` guard prevents a slow bake from clobbering
  //    a NEWER image ingested meanwhile (that newer image re-enqueues + NULLs the
  //    thumbnail, so we converge). Only writes when the source still matches.
  const upd = await db.query(
    `UPDATE auction_lots
       SET thumbnail_url = $1, thumbnail_source_url = $2
     WHERE id = $3 AND image_url = $2`,
    [cdnUrl, src, lotId],
  );

  if (upd.rowCount === 0) {
    // Source changed between read and write — leave it for the re-enqueued bake.
    log.warn("bake_source_changed_skip_writeback", { lotId });
    return;
  }

  // 5) Keep the read models in sync directly (cheaper than a full recompute;
  //    thumbnails don't affect counts/facets). At most one row per table has this
  //    lot as its chosen lot_id.
  await db.query(`UPDATE car_listings SET thumbnail_url = $1 WHERE lot_id = $2`, [cdnUrl, lotId]);
  await db.query(`UPDATE car_listings_archived SET thumbnail_url = $1 WHERE lot_id = $2`, [cdnUrl, lotId]);

  log.info("bake_done", { lotId, baseKey });
}
