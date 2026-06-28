# 06 — Infrastructure (AWS + Pulumi)

All AWS resources are defined in [`infra/src/`](../infra/src/) with **Pulumi
(TypeScript)**. This doc maps the code to the running infrastructure and explains
the non-obvious choices.

Entry point: [`infra/src/index.ts`](../infra/src/index.ts), which wires the
modules in order: **secrets → queues → IAM → Lambdas → Step Functions →
schedules**, then exports the ARNs/names operators need.

```mermaid
flowchart TD
  secrets["secrets.ts<br/>Secrets Manager"] --> iam
  queues["queues.ts<br/>SQS FIFO + DLQ"] --> iam
  iam["iam.ts<br/>Lambda / SFN / Scheduler roles"] --> lambdas
  lambdas["lambdas.ts<br/>10 Lambda functions"] --> esm["EventSourceMapping<br/>SQS → detail worker"]
  lambdas --> sfn["step-functions.ts<br/>5 state machines"]
  sfn --> sched["schedules.ts<br/>EventBridge Scheduler"]
  sched --> outputs["index.ts exports<br/>ARNs, names, queue URL"]
```

---

## 1. Stack config & conventions

[`infra/src/config.ts`](../infra/src/config.ts) — typed accessors over Pulumi
config.

| Setting | Source | Default |
|---|---|---|
| `region` | `aws:region` | (required) — convention `eu-central-1` |
| `projectName` | `projectName` | `auctions-ingestion` |
| `environment` | `environment` | the stack name |
| `auctionsApiBaseUrl` | `auctionsApiBaseUrl` | `https://auctionsapi.com/api` |
| `hourlySyncScheduleExpression` | config | `rate(1 hour)` |
| `dailyReferenceSyncScheduleExpression` | config | `rate(1 day)` |
| `logRetentionDays` | config | `14` |
| `perPage` | config | `1000` |
| `incrementalMinutes` | config | `75` |
| `auctionsApiKey` | **secret** | — |
| `neonDatabaseUrl` | **secret** | — |

- **Name prefix:** `${projectName}-${environment}` (e.g.
  `auctions-ingestion-dev`). Every resource name uses it.
- **Standard tags:** `Project`, `Environment`, `ManagedBy: pulumi`.
- **State backend & auth** follow the shared Pulumi conventions: **S3 state
  backend** (not Pulumi Cloud), `PULUMI_CONFIG_PASSPHRASE` encryption, local **SSO**
  / CI **GitHub OIDC**. `Pulumi.dev.yaml` is committed (holds only encrypted
  secrets). See the repo README + the user's Pulumi conventions.

---

## 2. Secrets ([`secrets.ts`](../infra/src/secrets.ts))

Two Secrets Manager secrets are created — `${prefix}/AUCTIONS_API_KEY` and
`${prefix}/NEON_DATABASE_URL` — with their values pushed from Pulumi config
secrets.

> **Important nuance:** the Lambdas do **not** read Secrets Manager at runtime.
> The secret **values** are also injected directly as Lambda env vars (from the
> same Pulumi config secrets) to keep cold starts simple and avoid an SDK call per
> invocation. The standalone secrets exist for central rotation and for a future
> VPC / runtime-resolution setup. (`requireSecret` keeps values out of plaintext
> previews/outputs.)

---

## 3. SQS ([`queues.ts`](../infra/src/queues.ts))

The detail-refresh rate-limit chokepoint (Flow 5, see [04](04-ingestion-flows.md)).

| Resource | Config |
|---|---|
| `detailRefreshQueue` (`${prefix}-detail-refresh.fifo`) | FIFO; `contentBasedDeduplication: true`; `visibilityTimeout 60s`; `messageRetention 1 day`; redrive → DLQ after `maxReceiveCount 5` |
| `detailRefreshDlq` (`${prefix}-detail-refresh-dlq.fifo`) | FIFO (must match source); `messageRetention 14 days` |

FIFO + content-dedup collapses duplicate refreshes of the same listing within the
5-minute dedup window into one delivery. The backend must enqueue with a
`MessageGroupId` (e.g. `"auctionsapi"`).

---

## 4. Lambdas ([`lambdas.ts`](../infra/src/lambdas.ts))

### Packaging
Handlers in `packages/functions/` are bundled by
[`build.mjs`](../packages/functions/build.mjs) (esbuild) into **one ESM file per
handler** under `packages/functions/dist/`, with `pg` bundled in and `@aws-sdk/*`
left external (provided by the runtime). Pulumi ships each bundle as `<name>.mjs`
**plus its `<name>.js.map`** (shipped under that exact name so
`NODE_OPTIONS=--enable-source-maps` produces readable stack traces). Pulumi hashes
the bundle content, so **rebuilding + `pulumi up` re-publishes the function with no
infra edit**. Build **before** `pulumi up`.

### Common settings (all functions)
- runtime **`nodejs20.x`**, ESM from `.mjs`
- shared execution role (logs + secrets + SQS consume)
- env vars: `AUCTIONS_API_BASE_URL`, `AUCTIONS_API_KEY`, `NEON_DATABASE_URL`,
  `PG_POOL_MAX=2`, `NODE_OPTIONS=--enable-source-maps`
- a pre-created CloudWatch **log group** with `logRetentionDays` retention (so
  Lambda doesn't create a never-expire one)
- **native JSON logging** (`loggingConfig`: `applicationLogLevel INFO`,
  `systemLogLevel WARN`) — pairs with the structured logger

### The 10 functions (note: several share one bundle)

| Logical name | Bundle | Export | Timeout | Mem | Special |
|---|---|---|---|---|---|
| `syncCarsPage` | syncCarsPage | handler | 300s | 512 | merged fetch+upsert page |
| `syncArchivedLotsPage` | syncArchivedLotsPage | handler | 300s | 512 | merged fetch+archive page |
| `syncReferenceData` | syncReferenceData | handler | 900s | 512 | legacy single-Lambda reference |
| `referenceInit` | syncReferenceData | `referenceInitHandler` | 60s | 256 | loop: upsert mfgs + build worklist |
| `referenceManufacturer` | syncReferenceData | `referenceManufacturerHandler` | 300s | 256 | loop: one manufacturer/step |
| `referenceFinalize` | syncReferenceData | `referenceFinalizeHandler` | 30s | 256 | loop: mark succeeded |
| `refreshListingDetail` | refreshListingDetail | handler | 30s | 256 | **reservedConcurrency 1**, `DETAIL_REFRESH_PACE_MS=1000` |
| `createSyncRun` | syncRunLifecycle | `createHandler` | 30s | 256 | SFN InitSyncRun |
| `finalizeSyncRun` | syncRunLifecycle | `finalizeHandler` | 30s | 256 | SFN FinalizeSyncRun |
| `markSyncFailed` | syncRunLifecycle | `failHandler` | 30s | 256 | SFN MarkSyncFailed |

The page functions get 300s + 512 MB for headroom (network call + bulk upsert +
two recomputes). `refreshListingDetail`'s `reservedConcurrency 1` is the hard
guarantee that no number of users can exceed the rate limit.

### SQS event source mapping (in `index.ts`)
`detailRefreshQueue` → `refreshListingDetail`, `batchSize 1`,
`functionResponseTypes: ["ReportBatchItemFailures"]` — each message
succeeds/fails independently and reservedConcurrency keeps the drain serial.

---

## 5. IAM ([`iam.ts`](../infra/src/iam.ts)) — least privilege

```mermaid
flowchart LR
  subgraph Lambda role
    L1[CloudWatch Logs]
    L2["Secrets: GetSecretValue<br/>scoped to the 2 secret ARNs"]
    L3["SQS: Receive/Delete/GetAttrs/ChangeVis<br/>scoped to the detail queue"]
  end
  subgraph SFN role
    S1["lambda:InvokeFunction<br/>scoped to the ingestion fn ARNs"]
    S2[CloudWatch log delivery]
    S3["StartExecution / DescribeExecution / StopExecution<br/>+ managed EventBridge callback rule (.sync:2)"]
  end
  subgraph Scheduler role
    C1["states:StartExecution<br/>scoped to the 2 state-machine ARNs"]
  end
```

- **Lambda role** — `sts:AssumeRole` by `lambda.amazonaws.com`; logs; secret read
  scoped to the two secret ARNs (with the `*` suffix Secrets Manager appends); SQS
  consume scoped to the detail queue. **No VPC permissions** (see §8).
- **Step Functions role** — invoke exactly the ingestion Lambda ARNs (+ versioned
  `:*`); log delivery; and (added in `index.ts`) the `StartExecution` /
  `DescribeExecution` / `StopExecution` + managed EventBridge rule permissions the
  `.sync:2` nested-execution integration requires (the rule perm is scoped to the
  single managed rule in this account/region, not a wildcard).
- **Scheduler role** — `states:StartExecution` scoped to the two scheduled state
  machine ARNs.

---

## 6. Step Functions ([`step-functions.ts`](../infra/src/step-functions.ts))

Five `STANDARD` state machines (full ASL walkthrough in
[04-ingestion-flows.md](04-ingestion-flows.md)):

| Machine | Shape | Sync Lambda(s) |
|---|---|---|
| `full-inventory-backfill` | paginated loop | `syncCarsPage` |
| `hourly-cars-sync` | paginated loop | `syncCarsPage` |
| `archived-lots-sync` | paginated loop | `syncArchivedLotsPage` |
| `combined-hourly-sync` | sequential nest (`startExecution.sync:2`) | the two hourly machines |
| `reference-sync` | manufacturer-index loop | `referenceInit`/`Manufacturer`/`Finalize` |

Each has a dedicated CloudWatch log group
(`/aws/vendedlogs/states/${prefix}-<name>`) with `level: ERROR` +
`includeExecutionData`.

---

## 7. EventBridge Scheduler ([`schedules.ts`](../infra/src/schedules.ts))

Two schedules, both targeting **state machines** (no Lambda targets):
`hourly-combined-sync` → `combinedHourlySync`, `daily-reference-sync` →
`referenceSync`. See the table in [04 §Schedules](04-ingestion-flows.md#schedules-eventbridge-scheduler).
`aws.scheduler.Schedule` doesn't accept tags (tagging is per schedule-group; the
default group is used).

---

## 8. The "no VPC" decision

The Lambdas have **no VPC config** and reach Neon over the **public internet**
using the Neon **pooled** (PgBouncer) connection string. Rationale:

- Neon's endpoint is public + TLS — full cert validation works without a custom CA.
- No VPC means **no NAT gateway cost** and **no cold-start ENI penalty**.
- The pooled endpoint (PgBouncer, transaction pooling) lets thousands of
  short-lived invocations share Postgres backends — but it forbids **named
  prepared statements**, which is why the DB layer uses raw `pg` with a tiny pool
  (`max 2`) and no prepared statements. See [`shared/db.ts`](../packages/functions/shared/db.ts).

---

## 9. Outputs (what `pulumi up` exports)

From [`index.ts`](../infra/src/index.ts):

- `region`, `prefix`
- `stateMachineArns` — fullInventoryBackfill, hourlyCarsSync, archivedLotsSync,
  combinedHourlySync, referenceSync
- `lambdaNames` — all 10 functions
- `scheduleNames` — hourlyCombinedSync, dailyReferenceSync
- `secretNames` — the two secret names (not values)
- **`detailRefreshQueueUrl`**, `detailRefreshQueueArn`, `detailRefreshDlqUrl` —
  the app backend enqueues to `detailRefreshQueueUrl` (FIFO: include a
  `MessageGroupId`)

See [07-operations-runbook.md](07-operations-runbook.md) for how to start
machines from these outputs.
