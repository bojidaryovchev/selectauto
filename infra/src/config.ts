/**
 * Strongly-typed accessors for Pulumi stack config.
 *
 * Non-secret values come from `pulumi config set ...`.
 * Secret values (auctionsApiKey, neonDatabaseUrl) come from
 * `pulumi config set --secret ...` and are stored encrypted in the S3 state
 * backend (passphrase-protected, same backend pattern as the ecommerce-store
 * project). They are pushed into AWS Secrets Manager by src/secrets.ts.
 */
import * as pulumi from "@pulumi/pulumi";

const cfg = new pulumi.Config(); // project-scoped: auctions-ingestion-infra:*
const awsCfg = new pulumi.Config("aws");

export const stack = pulumi.getStack();

export const config = {
  region: awsCfg.require("region"),

  projectName: cfg.get("projectName") ?? "auctions-ingestion",
  environment: cfg.get("environment") ?? stack,

  auctionsApiBaseUrl: cfg.get("auctionsApiBaseUrl") ?? "https://auctionsapi.com/api",

  // Schedules. Defaults match the brief.
  hourlySyncScheduleExpression: cfg.get("hourlySyncScheduleExpression") ?? "rate(1 hour)",
  dailyReferenceSyncScheduleExpression: cfg.get("dailyReferenceSyncScheduleExpression") ?? "rate(1 day)",
  // Weekly projection drift-repair sweep. Off-peak Sunday 03:00 UTC by default.
  weeklyDriftSweepScheduleExpression: cfg.get("weeklyDriftSweepScheduleExpression") ?? "cron(0 3 ? * SUN *)",

  logRetentionDays: cfg.getNumber("logRetentionDays") ?? 14,

  // Pagination / sync tuning.
  perPage: cfg.getNumber("perPage") ?? 1000,
  incrementalMinutes: cfg.getNumber("incrementalMinutes") ?? 75,

  // Secrets (stored encrypted in Pulumi state; pushed to Secrets Manager).
  // We use requireSecret so they never print in plaintext in previews/outputs.
  auctionsApiKey: cfg.requireSecret("auctionsApiKey"),
  neonDatabaseUrl: cfg.requireSecret("neonDatabaseUrl"),
};

/** Convenience prefix for naming resources, e.g. "auctions-ingestion-dev". */
export const namePrefix = `${config.projectName}-${config.environment}`;

/** Standard tags applied to all resources. */
export const tags: Record<string, string> = {
  Project: config.projectName,
  Environment: config.environment,
  ManagedBy: "pulumi",
};
