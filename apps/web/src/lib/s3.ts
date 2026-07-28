import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Private document storage for the contracts & payments module: generated
 * payment-notice PDFs and uploaded proof-of-payment files. The bucket
 * (`selectauto-<stack>-documents-<account>`, infra/src/storage.ts) has Block
 * Public Access on and NO CloudFront — objects are reachable only through
 * short-lived presigned URLs minted here, in admin-gated server code.
 *
 * Credentials are passed EXPLICITLY from `SA_*` env vars rather than picked up
 * ambiently from `AWS_*`: Vercel reserves the standard names, and being explicit
 * keeps it obvious which identity each client uses (the least-privilege
 * `selectauto-<stack>-web-app` IAM user — GetObject/PutObject on this bucket only).
 *
 * Everything degrades gracefully when the vars are absent (local dev without S3):
 * `isDocumentStorageConfigured()` is false, callers skip archival, and notice
 * PDFs still render on demand from their frozen snapshots.
 */

const region = process.env.SA_AWS_REGION;
const bucket = process.env.SA_DOCUMENTS_BUCKET;
const accessKeyId = process.env.SA_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.SA_AWS_SECRET_ACCESS_KEY;

/** True when all four SA_* vars are present, i.e. S3 calls can be attempted. */
export function isDocumentStorageConfigured(): boolean {
  return Boolean(region && bucket && accessKeyId && secretAccessKey);
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isDocumentStorageConfigured()) {
    throw new Error("Document storage is not configured (missing SA_* env vars).");
  }
  client ??= new S3Client({
    region,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  });
  return client;
}

/** Uploads an object. Returns the key it was written under. */
export async function putDocument(args: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      // Documents are never rewritten under the same key (versions get new
      // keys), so they're safe to cache privately for a long time.
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
  return args.key;
}

/**
 * Removes an object — only used when an admin deletes a CANCELLED contract or
 * deposit, so its archived PDFs and attachments don't linger. Best-effort by
 * design: the caller logs and carries on, since a stale object is harmless
 * next to a failed delete. Needs s3:DeleteObject on the web-app IAM user
 * (infra/src/iam.ts).
 */
export async function deleteDocument(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Fetches an object's bytes (used to serve an archived PDF byte-for-byte). */
export async function getDocument(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * A short-lived (default 5 min) presigned GET URL, forcing a download with the
 * given filename. Used for payment attachments, so the browser fetches the file
 * straight from S3 instead of streaming it through the serverless function.
 */
export async function getDocumentDownloadUrl(args: {
  key: string;
  filename: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: args.key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(args.filename)}"`,
  });
  return getSignedUrl(getClient(), command, { expiresIn: args.expiresInSeconds ?? 300 });
}
