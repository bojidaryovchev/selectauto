/**
 * Documents storage for the contracts & payments module.
 *
 * (The former thumbnail-bake pipeline — a private S3 bucket + CloudFront that the
 * bake worker wrote WebP card thumbnails into — was removed: the catalog now
 * serves card images DIRECTLY from the source CDNs via plain <img>, so there is
 * no baked-thumbnail bucket or distribution anymore.)
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { namePrefix, tags } from "./config";

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
