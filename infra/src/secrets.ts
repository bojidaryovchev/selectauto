/**
 * AWS Secrets Manager secrets for the ingestion system.
 *
 * Strategy:
 *   - Pulumi config holds the secret values (encrypted in the S3 state backend).
 *   - We create one Secrets Manager secret per value and push the value in as a
 *     SecretVersion. Lambdas read these at runtime.
 *
 * Why Secrets Manager (vs env vars): rotation tooling, centralized access,
 * audit, and the values never appear in the Lambda's static configuration.
 *
 * In practice the Lambda env vars are populated with the resolved secret VALUES
 * (not the ARNs) — see the NOTE below.
 *
 * NOTE: To keep cold starts simple and avoid an extra runtime SDK call per
 * invocation, the Lambda env vars are populated with the secret *values* via
 * Pulumi (which already has them as secrets). The standalone Secrets Manager
 * secrets are still created so you can rotate centrally and so other services
 * (or a future VPC setup) can read them. If you prefer pure runtime resolution,
 * see README "Runtime secret resolution".
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { config, namePrefix, tags } from "./config";

export interface Secrets {
  auctionsApiKeySecret: aws.secretsmanager.Secret;
  neonDatabaseUrlSecret: aws.secretsmanager.Secret;
}

export function createSecrets(): Secrets {
  // --- AuctionsAPI key ---
  const auctionsApiKeySecret = new aws.secretsmanager.Secret("auctions-api-key", {
    name: `${namePrefix}/AUCTIONS_API_KEY`,
    description: "AuctionsAPI x-api-key for vehicle ingestion",
    tags,
  });
  new aws.secretsmanager.SecretVersion("auctions-api-key-v", {
    secretId: auctionsApiKeySecret.id,
    secretString: config.auctionsApiKey, // pulumi secret Output<string>
  });

  // --- Neon database URL (use the POOLED connection string) ---
  const neonDatabaseUrlSecret = new aws.secretsmanager.Secret("neon-database-url", {
    name: `${namePrefix}/NEON_DATABASE_URL`,
    description: "Neon pooled Postgres connection string for ingestion Lambdas",
    tags,
  });
  new aws.secretsmanager.SecretVersion("neon-database-url-v", {
    secretId: neonDatabaseUrlSecret.id,
    secretString: config.neonDatabaseUrl,
  });

  return { auctionsApiKeySecret, neonDatabaseUrlSecret };
}

/**
 * Secret ARNs as an array (for IAM resource scoping).
 */
export function secretArns(s: Secrets): pulumi.Output<string>[] {
  return [s.auctionsApiKeySecret.arn, s.neonDatabaseUrlSecret.arn];
}
