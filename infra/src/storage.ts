/**
 * Thumbnail storage: a private S3 bucket + CloudFront distribution.
 *
 * The bake worker (see lambdas.ts `bakeThumbnail`) writes one small WebP card
 * thumbnail per auction lot here, keyed by content hash of the source image URL
 * (`thumb/<sha256>.webp`). The Next.js catalog grid then loads those thumbnails
 * DIRECTLY from CloudFront via `<Image unoptimized>`, bypassing Vercel Image
 * Optimization entirely — which is the whole point of this project (Vercel image
 * optimization was ~80% of the bill).
 *
 * Design:
 *   - Bucket has Block Public Access ON; objects are reachable ONLY through the
 *     CloudFront distribution, authorized by Origin Access Control (OAC) + a
 *     bucket policy scoped to this exact distribution ARN.
 *   - Objects are written by the worker with `Cache-Control: public,
 *     max-age=31536000, immutable`. Keys are content-addressed, so a changed
 *     source image yields a NEW key — objects are write-once and never need CDN
 *     invalidation.
 *   - PriceClass_100 (NA + EU edges) matches the BG/EU audience at lowest cost.
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { namePrefix, tags } from "./config";

export interface Storage {
  thumbnailBucket: aws.s3.Bucket;
  distribution: aws.cloudfront.Distribution;
  /** `https://<dist>.cloudfront.net` — base URL the worker stores in thumbnail_url. */
  cdnBaseUrl: pulumi.Output<string>;
}

export interface DocumentsStorage {
  documentsBucket: aws.s3.Bucket;
}

/**
 * Private bucket for the contracts & payments module (docs/
 * contracts-payments-plan.md): generated PDFs (payment notices, contracts) and
 * uploaded proof-of-payment files. No CloudFront — these are sensitive
 * documents, reachable ONLY via short-lived presigned URLs minted by admin
 * server actions in the web app (see the web-app IAM user in iam.ts).
 * Versioning is on as belt-and-braces for the module's append-only guarantee.
 */
export function createDocumentsStorage(): DocumentsStorage {
  // Account-scoped name for global uniqueness — same reasoning as the
  // thumbnail bucket above.
  const accountId = aws.getCallerIdentityOutput({}).accountId;

  const documentsBucket = new aws.s3.Bucket("documents-bucket", {
    bucket: pulumi.interpolate`${namePrefix}-documents-${accountId}`,
    tags,
  });

  // Separate resource (the inline `versioning` bucket arg is deprecated).
  new aws.s3.BucketVersioning("documents-bucket-versioning", {
    bucket: documentsBucket.id,
    versioningConfiguration: { status: "Enabled" },
  });

  new aws.s3.BucketPublicAccessBlock("documents-bucket-pab", {
    bucket: documentsBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  return { documentsBucket };
}

export function createStorage(): Storage {
  // S3 bucket names are GLOBALLY unique, so a name derived purely from the
  // (project, environment) prefix — identical across accounts — collides the
  // moment a second account deploys the same stack. Scope it to the account id
  // so each account gets its own bucket. The name is not referenced anywhere by
  // value (the bake worker gets it via the THUMBNAIL_BUCKET env output, the app
  // serves from the CloudFront domain), so this is transparent to consumers.
  const accountId = aws.getCallerIdentityOutput({}).accountId;

  // ── Private bucket ──────────────────────────────────────────────────────────
  const thumbnailBucket = new aws.s3.Bucket("thumbnail-bucket", {
    bucket: pulumi.interpolate`${namePrefix}-thumbnails-${accountId}`,
    tags,
  });

  new aws.s3.BucketPublicAccessBlock("thumbnail-bucket-pab", {
    bucket: thumbnailBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  // ── CloudFront Origin Access Control (SigV4-signs CloudFront→S3 requests) ────
  const oac = new aws.cloudfront.OriginAccessControl("thumbnail-oac", {
    name: `${namePrefix}-thumbnail-oac`,
    description: "OAC for the thumbnail bucket",
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  });

  // Managed cache policy "CachingOptimized" — honors the object's Cache-Control,
  // compresses, no query/cookie/header keys. Ideal for immutable static assets.
  const CACHING_OPTIMIZED = "658327ea-f89d-4fab-a63d-7e88639e58f6";

  const distribution = new aws.cloudfront.Distribution("thumbnail-cdn", {
    enabled: true,
    comment: `${namePrefix} card thumbnails`,
    priceClass: "PriceClass_100",
    httpVersion: "http2and3",
    origins: [
      {
        originId: "thumbnail-s3",
        domainName: thumbnailBucket.bucketRegionalDomainName,
        originAccessControlId: oac.id,
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: "thumbnail-s3",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: CACHING_OPTIMIZED,
    },
    restrictions: { geoRestriction: { restrictionType: "none" } },
    viewerCertificate: { cloudfrontDefaultCertificate: true },
    tags,
  });

  // ── Bucket policy: allow ONLY this distribution to read objects ──────────────
  new aws.s3.BucketPolicy("thumbnail-bucket-policy", {
    bucket: thumbnailBucket.id,
    policy: pulumi.all([thumbnailBucket.arn, distribution.arn]).apply(([bucketArn, distArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowCloudFrontServicePrincipalReadOnly",
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
            Action: ["s3:GetObject"],
            Resource: `${bucketArn}/*`,
            Condition: { StringEquals: { "AWS:SourceArn": distArn } },
          },
        ],
      }),
    ),
  });

  const cdnBaseUrl = pulumi.interpolate`https://${distribution.domainName}`;

  return { thumbnailBucket, distribution, cdnBaseUrl };
}
