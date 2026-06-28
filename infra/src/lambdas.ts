/**
 * Lambda functions for the ingestion system.
 *
 * Packaging model
 * ---------------
 * The handler TypeScript in `packages/functions/` is compiled + bundled to
 * `packages/functions/dist/<name>.js` (single ESM file per handler, with `pg`
 * bundled in) BEFORE `pulumi up`. See `packages/functions/package.json` build
 * script and README "Build". Pulumi then ships each bundle as the function code,
 * hashing the bundle content — so rebuilding after a code change and re-running
 * `pulumi up` re-publishes the function with NO infra edit required.
 *
 * Why bundle: avoids shipping node_modules and keeps cold starts small. `pg` is
 * the only heavy runtime dep and bundles cleanly.
 *
 * All functions share:
 *   - runtime nodejs20.x
 *   - the same execution role (logs + secrets)
 *   - env vars for the API base URL + the two secret VALUES (injected from
 *     Pulumi config secrets; see secrets.ts note)
 *   - a CloudWatch log group with configurable retention
 */
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";
import { config, namePrefix, tags } from "./config";

// Resolve the functions bundle dir. infra/ is at the repo root; the Lambda
// handlers live in packages/functions (pnpm monorepo). From infra/src that is
// ../../packages/functions/dist.
const FUNCTIONS_DIST = path.resolve(__dirname, "..", "..", "packages", "functions", "dist");

export interface LambdaSet {
  // Merged fetch+write per page (replaces the old split fetch/upsert/archive fns).
  syncCarsPage: aws.lambda.Function;
  syncArchivedLotsPage: aws.lambda.Function;
  // Legacy single-Lambda reference sync (bounded via maxManufacturers; quick tests).
  syncReferenceData: aws.lambda.Function;
  // Timeout-proof reference sync: Step Functions loop, one manufacturer per step.
  referenceInit: aws.lambda.Function;
  referenceManufacturer: aws.lambda.Function;
  referenceFinalize: aws.lambda.Function;
  refreshListingDetail: aws.lambda.Function;
  createSyncRun: aws.lambda.Function;
  finalizeSyncRun: aws.lambda.Function;
  markSyncFailed: aws.lambda.Function;
}

interface MakeFnOpts {
  /** Logical resource name + part of the AWS function name. */
  name: string;
  /** Bundle file under packages/functions/dist, e.g. "syncCarsPage.js". */
  bundleFile: string;
  /** Exported handler name in the bundle, e.g. "handler" / "createHandler". */
  exportName?: string;
  timeoutSeconds?: number;
  memoryMb?: number;
  /** Cap concurrent executions (e.g. 1 for the serialized detail drain worker). */
  reservedConcurrency?: number;
  /** Extra env vars merged on top of the common set. */
  extraEnv?: Record<string, pulumi.Input<string>>;
}

export function createLambdas(
  /** ARN of the shared Lambda execution role (from iam.ts). */
  role: pulumi.Input<string>,
  secretEnv: { auctionsApiKey: pulumi.Output<string>; neonDatabaseUrl: pulumi.Output<string> },
): LambdaSet {
  const commonEnvVars: Record<string, pulumi.Input<string>> = {
    AUCTIONS_API_BASE_URL: config.auctionsApiBaseUrl,
    // Secret values injected from Pulumi config secrets. They are marked secret
    // so they never print in plaintext. See secrets.ts for the rotation note.
    AUCTIONS_API_KEY: secretEnv.auctionsApiKey,
    NEON_DATABASE_URL: secretEnv.neonDatabaseUrl,
    // Keep the pg pool tiny in Lambda.
    PG_POOL_MAX: "2",
    NODE_OPTIONS: "--enable-source-maps",
  };

  const makeFn = (opts: MakeFnOpts): aws.lambda.Function => {
    const fnName = `${namePrefix}-${opts.name}`;

    // Pre-create the log group so we control retention (Lambda would otherwise
    // create it with "never expire").
    const logGroup = new aws.cloudwatch.LogGroup(`${opts.name}-logs`, {
      name: `/aws/lambda/${fnName}`,
      retentionInDays: config.logRetentionDays,
      tags,
    });

    return new aws.lambda.Function(
      opts.name,
      {
        name: fnName,
        runtime: "nodejs20.x",
        // Bundle is a single ESM file; we ship it as <base>.mjs.
        handler: `${path.basename(opts.bundleFile, ".js")}.${opts.exportName ?? "handler"}`,
        role,
        code: new pulumi.asset.AssetArchive({
          // Ship the bundle AND its sourcemap so NODE_OPTIONS=--enable-source-maps
          // produces readable stack traces. The bundle's internal
          // `//# sourceMappingURL=<base>.js.map` comment (esbuild) references the
          // .js.map name, so we ship the map under that exact name next to the
          // .mjs — NOT renamed to .mjs.map, or Node won't find it.
          [`${path.basename(opts.bundleFile, ".js")}.mjs`]: new pulumi.asset.FileAsset(
            path.join(FUNCTIONS_DIST, opts.bundleFile),
          ),
          [`${path.basename(opts.bundleFile, ".js")}.js.map`]: new pulumi.asset.FileAsset(
            path.join(FUNCTIONS_DIST, `${opts.bundleFile}.map`),
          ),
        }),
        timeout: opts.timeoutSeconds ?? 60,
        memorySize: opts.memoryMb ?? 256,
        ...(opts.reservedConcurrency !== undefined ? { reservedConcurrentExecutions: opts.reservedConcurrency } : {}),
        environment: {
          variables: opts.extraEnv ? { ...commonEnvVars, ...opts.extraEnv } : commonEnvVars,
        },
        // Native nodejs20.x JSON logging: the runtime emits each line as a JSON
        // envelope (timestamp, level, requestId) and our structured payloads
        // slot in. Query in CloudWatch Logs Insights by field. applicationLogLevel
        // gates our app logs; systemLogLevel gates the runtime's own logs.
        loggingConfig: {
          logFormat: "JSON",
          applicationLogLevel: "INFO",
          systemLogLevel: "WARN",
          logGroup: logGroup.name,
        },
        tags,
      },
      { dependsOn: [logGroup] },
    );
  };

  return {
    // Merged fetch+upsert: one API call + a bulk upsert of up to per_page records
    // per invocation. Give it headroom for both the network call and the writes.
    syncCarsPage: makeFn({
      name: "syncCarsPage",
      bundleFile: "syncCarsPage.js",
      timeoutSeconds: 300,
      memoryMb: 512,
    }),
    syncArchivedLotsPage: makeFn({
      name: "syncArchivedLotsPage",
      bundleFile: "syncArchivedLotsPage.js",
      timeoutSeconds: 300,
      memoryMb: 512,
    }),
    // Legacy single-Lambda reference sync (use maxManufacturers for quick tests;
    // the full catalog can exceed 15 min — use the looped state machine instead).
    syncReferenceData: makeFn({
      name: "syncReferenceData",
      bundleFile: "syncReferenceData.js",
      timeoutSeconds: 900,
      memoryMb: 512,
    }),
    // Looped reference sync — 3 handlers from the same bundle. Each step is short
    // (one manufacturer's models+generations), so modest timeouts suffice.
    referenceInit: makeFn({
      name: "referenceInit",
      bundleFile: "syncReferenceData.js",
      exportName: "referenceInitHandler",
      timeoutSeconds: 60,
      memoryMb: 256,
    }),
    referenceManufacturer: makeFn({
      name: "referenceManufacturer",
      bundleFile: "syncReferenceData.js",
      exportName: "referenceManufacturerHandler",
      // One manufacturer = up to ~dozens of model+generation calls at 1 req/sec.
      // 300s covers even the largest manufacturer comfortably.
      timeoutSeconds: 300,
      memoryMb: 256,
    }),
    referenceFinalize: makeFn({
      name: "referenceFinalize",
      bundleFile: "syncReferenceData.js",
      exportName: "referenceFinalizeHandler",
      timeoutSeconds: 30,
    }),
    // Detail-refresh SQS drain worker. reservedConcurrency=1 guarantees only one
    // copy ever runs, so no number of enqueued user requests can exceed the
    // AuctionsAPI 1 req/sec budget. Paced internally via DETAIL_REFRESH_PACE_MS.
    refreshListingDetail: makeFn({
      name: "refreshListingDetail",
      bundleFile: "refreshListingDetail.js",
      timeoutSeconds: 30,
      reservedConcurrency: 1,
      extraEnv: { DETAIL_REFRESH_PACE_MS: "1000" },
    }),
    // sync-run lifecycle: three handlers exported from one bundle.
    createSyncRun: makeFn({
      name: "createSyncRun",
      bundleFile: "syncRunLifecycle.js",
      exportName: "createHandler",
      timeoutSeconds: 30,
    }),
    finalizeSyncRun: makeFn({
      name: "finalizeSyncRun",
      bundleFile: "syncRunLifecycle.js",
      exportName: "finalizeHandler",
      timeoutSeconds: 30,
    }),
    markSyncFailed: makeFn({
      name: "markSyncFailed",
      bundleFile: "syncRunLifecycle.js",
      exportName: "failHandler",
      timeoutSeconds: 30,
    }),
  };
}

/** Flat list of all Lambda ARNs for IAM scoping. */
export function allLambdaArns(s: LambdaSet): pulumi.Output<string>[] {
  return Object.values(s).map((fn) => fn.arn);
}
