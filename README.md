# AuctionsAPI → Neon Ingestion

Production-ready ingestion system that syncs vehicle auction data from
[AuctionsAPI](https://auctionsapi.com/auction-docs) into **Neon Serverless
Postgres**. Our website/backend queries **our own database**, never AuctionsAPI
directly — AuctionsAPI is treated purely as an external supplier sync API.

Built with **Pulumi (TypeScript) + AWS Lambda (Node 20) + Step Functions +
EventBridge Scheduler + Secrets Manager + CloudWatch**.

> **Field mappings in this repo were verified against the LIVE AuctionsAPI**
> (June 2026), not guessed. See [Verified API facts](#verified-api-facts).

---

## Contents / project structure

```
.
├── db/                          # Database schema + migrations
│   ├── schema.ts                # Drizzle schema (source of truth for shape + typed queries)
│   ├── migrations/0001_initial.sql   # Plain SQL run in production (migrate.mjs)
│   ├── migrate.mjs              # Tiny idempotent SQL migration runner
│   └── drizzle.config.ts        # Drizzle Kit config (dev-time generation)
│
├── functions/                   # Lambda source (bundled by esbuild before deploy)
│   ├── shared/
│   │   ├── types.ts             # API payload + Lambda<->SFN message types
│   │   ├── auctionsApiClient.ts # HTTP client (x-api-key, retry classification, pagination)
│   │   ├── db.ts                # Neon pool + idempotent upserts
│   │   ├── normalize.ts         # Raw API -> DB row shapes (keeps raw_json)
│   │   ├── pagination.ts        # Loop stop-conditions
│   │   └── syncRun.ts           # sync_runs lifecycle + resume helpers
│   ├── syncCarsPage/handler.ts          # fetch + upsert one /cars page (merged)
│   ├── syncArchivedLotsPage/handler.ts  # fetch + archive one /archived-lots page (merged)
│   ├── syncReferenceData/handler.ts
│   ├── refreshListingDetail/handler.ts
│   ├── syncRunLifecycle/handler.ts   # create / finalize / fail (3 exports)
│   └── build.mjs                # esbuild bundler -> functions/dist/<name>.js
│
├── infra/                       # Pulumi program
│   ├── src/{index,config,iam,secrets,lambdas,step-functions,schedules}.ts
│   ├── Pulumi.yaml
│   ├── Pulumi.dev.yaml.example
│   ├── bootstrap-pulumi-backend.ps1  # one-time: S3 state bucket
│   └── bootstrap-github-oidc.ps1     # one-time: GitHub Actions OIDC role
│
├── scripts/start-backfill.ps1   # manually start the full backfill
└── docs/sample-cars-response.json
```

---

## Architecture

```
                         EventBridge Scheduler
                          │                  │
            rate(1 hour)  │                  │  rate(1 day)
                          ▼                  ▼
         ┌────────────────────────┐   ┌───────────────────┐
         │ combinedHourlySync SM  │   │ syncReferenceData │  (Lambda, manual/daily)
         │  cars → archived-lots  │   └───────────────────┘
         └────────────────────────┘
                          │ startExecution.sync
            ┌─────────────┴──────────────┐
            ▼                            ▼
   hourlyCarsSync SM            archivedLotsSync SM       fullInventoryBackfill SM
   (mode=incremental,75m)       (mode=incremental,75m)    (mode=full, manual)
            │                            │                         │
            └──────── shared paginated loop shape ────────────────┘
                                  │
   Init → SyncPage → HasNext? ─no→ Finalize → Succeed
            ▲            │yes        (SyncPage = fetch + upsert in ONE Lambda;
            └─ Increment ← Wait 1s    page data never crosses SFN state)
                         │ (any task error)
                         └→ MarkSyncFailed → Fail

   Lambdas ── x-api-key ──▶ AuctionsAPI        Lambdas ── pooled TLS ──▶ Neon Postgres
   (no VPC; public egress)                     (no VPC; public egress)
```

### Ingestion flows

| Flow | Trigger | Endpoint | State machine / Lambda |
|------|---------|----------|------------------------|
| 1. Full inventory backfill | Manual | `/cars` (no minutes, per_page=1000) | `fullInventoryBackfill` |
| 2. Hourly active cars | EventBridge `rate(1 hour)` | `/cars?minutes=75&per_page=1000` | `hourlyCarsSync` (via combined) |
| 3. Hourly archived lots | After cars | `/archived-lots?minutes=75&per_page=1000` | `archivedLotsSync` (via combined) |
| 4. Reference data | Manual + daily | `/manufacturers/cars`, `/models/{id}/cars`, `/generations/{id}/cars` | `syncReferenceData` Lambda |
| 5. Detail refresh | Internal (app/manual) | `/search-lot/{lot}/{domain}` or `/search-vin/{vin}` | `refreshListingDetail` Lambda |

---

## Verified API facts

These were confirmed by calling the live API, and the code relies on them:

- **Auth:** header `x-api-key: <key>` (not Bearer). Base URL `https://auctionsapi.com/api`.
- **Pagination envelope** is Laravel `simplePaginate`:
  ```json
  { "data": [...],
    "links": { "first": "...", "last": null, "prev": null, "next": "...|null" },
    "meta":  { "current_page": 1, "from": 1, "path": "...", "per_page": 1000, "to": 1000 } }
  ```
  **There is NO `last_page`/`total`.** The authoritative next-page signal is
  **`links.next`** (a URL, or `null` on the last page). A past-the-end page
  returns **HTTP 200 with empty `data` and `links.next: null`**, so the loop
  terminates cleanly. The client also keeps an "empty/short page ⇒ stop" fallback.
- **`/cars`** returns car records with a nested **`lots[]`** array. We split these
  into `cars` + `auction_lots`. In `/cars`, `bid`/`buy_now`/`final_bid` are
  scalars (e.g. `buy_now: 0`).
- **`/archived-lots`** returns a **DIFFERENT, FLAT shape** — not car+lots:
  `{ archived_at, lot_id, car_id, vin, lot, domain:{id,name}, status:{name},
  bid:{value,updated_at}, buy_now:{value}, sale_date:{value}, final_bid:{value} }`.
  Here the prices are `{ value }` wrappers. The normalizer handles both forms.
- **Reference endpoints** return `{ data: [...] }`:
  - manufacturers: `{ id, name, cars_qty, image, models_qty }`
  - models: `{ id, name, cars_qty, manufacturer_id, generations_qty }`
  - generations: `{ id, name, cars_qty, from_year, to_year, model_id }`
- **Detail** (`/search-lot`, `/search-vin`) returns `{ data: <car object> }` (same
  `/cars` shape) with `lots[].prices` (price history array) — stored in `raw_json`.

The few remaining `TODO` comments concern only price **units/currency** semantics
(values are integers; we pass them through) — not field names.

---

## Database

Tables: `cars`, `auction_lots`, `manufacturers`, `vehicle_models`,
`vehicle_generations`, `sync_runs`. Every table stores `raw_json` for future
reprocessing. See [db/schema.ts](db/schema.ts) and
[db/migrations/0001_initial.sql](db/migrations/0001_initial.sql).

**Idempotency / unique keys (all upserts use `ON CONFLICT`):**

- `auction_lots (domain_id, lot_number)` — the reliable lot identity, used for
  both active and archived flows.
- `cars (external_car_id)` — unique when present; NULLs are distinct in Postgres.
- `manufacturers/vehicle_models/vehicle_generations (external_id)`.

**Fallback when `external_car_id` is missing:** we still upsert the **lots**
(keyed on `domain_id + lot_number`) and simply skip the car-row link. We never
rely on VIN alone for identity (VIN can be missing or duplicated); VIN is stored
and indexed for lookup only.

**Archiving never hard-deletes:** `archiveLots` sets `archived = TRUE` +
`archived_at` (preserving the upstream archive time) and updates
status/prices/sale_date.

---

## Prerequisites

- Node 20+, npm
- Pulumi CLI, AWS CLI v2
- An AWS account reachable via **SSO** (`aws sso login`), and a Neon project
- This repo uses the **S3 state backend + passphrase encryption** pattern (same
  as the sibling `ecommerce-store` project), not Pulumi Cloud.

---

## Setup

### 1. Install dependencies

```powershell
npm install                       # root (workspaces: db, functions, infra)
```

### 2. One-time: create the Pulumi S3 state backend

```powershell
$env:AWS_PROFILE = "your-sso-profile"
aws sso login
./infra/bootstrap-pulumi-backend.ps1 -Region eu-central-1 -Profile your-sso-profile
# Then log in to the backend it prints:
pulumi login s3://pulumi-state-<accountId>?region=eu-central-1
```

(Optional, for CI) create the GitHub OIDC deploy role:

```powershell
./infra/bootstrap-github-oidc.ps1 -GitHubOrg <org> -GitHubRepo selectauto -Profile your-sso-profile
```

### 3. Initialize the stack and set config

```powershell
cd infra
cp Pulumi.dev.yaml.example Pulumi.dev.yaml
pulumi stack init dev          # you'll be asked for a PULUMI_CONFIG_PASSPHRASE

# Non-secret config (defaults already in the example file):
pulumi config set aws:region eu-central-1
pulumi config set auctions-ingestion-infra:projectName auctions-ingestion
pulumi config set auctions-ingestion-infra:environment dev
pulumi config set auctions-ingestion-infra:auctionsApiBaseUrl https://auctionsapi.com/api
pulumi config set auctions-ingestion-infra:hourlySyncScheduleExpression "rate(1 hour)"
pulumi config set auctions-ingestion-infra:dailyReferenceSyncScheduleExpression "rate(1 day)"
pulumi config set auctions-ingestion-infra:logRetentionDays 14

# Secrets (encrypted into Pulumi state; pushed to Secrets Manager + Lambda env):
pulumi config set --secret auctions-ingestion-infra:auctionsApiKey  <YOUR_API_KEY>
pulumi config set --secret auctions-ingestion-infra:neonDatabaseUrl <NEON_POOLED_URL>
```

> **Neon URL:** use the **pooled** connection string (host contains `-pooler`),
> with `?sslmode=require`. The pooled endpoint (PgBouncer) is what keeps many
> short-lived Lambda invocations from exhausting Postgres backends.

### 4. Run the database migration

```powershell
$env:NEON_DATABASE_URL = "<NEON_POOLED_URL>"
npm run migrate            # applies db/migrations/*.sql idempotently
```

### 5. Deploy

```powershell
npm run deploy             # = build Lambda bundles, then `pulumi up` in infra/
```

`npm run deploy` runs `functions/build.mjs` (esbuild bundles each handler into
`functions/dist/<name>.js`, with `pg` bundled in) **before** `pulumi up`. Always
build before deploying; `npm run preview` does the same for a dry run.

---

## Operating the flows

### Start a full backfill (manual)

```powershell
$env:AWS_PROFILE = "your-sso-profile"
./scripts/start-backfill.ps1                  # from page 1
./scripts/start-backfill.ps1 -StartPage 42    # resume from a checkpoint page
```

This starts the `fullInventoryBackfill` state machine with
`{ flowType:"full_backfill", mode:"full", page:1, perPage:1000 }`. It fetches a
page, upserts cars+lots, waits 1 second, and repeats until `links.next` is null
(or an empty page). Progress is written to `sync_runs`.

### How the hourly sync works

EventBridge Scheduler fires `combinedHourlySync` on `rate(1 hour)`. That machine
runs `hourlyCarsSync` **then** `archivedLotsSync` **sequentially** (never in
parallel — that protects the 1 req/sec budget). Each uses `minutes=75` (not 60)
so delayed records aren't missed, and each upsert is idempotent, so overlapping
windows reprocessing the same records is harmless.

### Reference data

Runs daily via EventBridge (non-forced: it **skips** if manufacturers already
exist). Force a full refresh by invoking the Lambda with `{ "force": true }`:

```powershell
aws lambda invoke --function-name auctions-ingestion-dev-syncReferenceData `
  --payload '{"force":true}' --cli-binary-format raw-in-base64-out out.json
```

### Detail refresh (internal)

Invoke `refreshListingDetail` directly (e.g. from your backend when a detail page
is stale). Not exposed publicly.

```powershell
# by lot+domain
aws lambda invoke --function-name auctions-ingestion-dev-refreshListingDetail `
  --payload '{"lot":"45289258","domain":"iaai_com"}' --cli-binary-format raw-in-base64-out out.json
# by VIN
aws lambda invoke --function-name auctions-ingestion-dev-refreshListingDetail `
  --payload '{"vin":"WBA3B5G55FNS17722"}' --cli-binary-format raw-in-base64-out out.json
```

---

## Local testing

- **Type-check everything:** `npm run type-check`.
- **Client/normalize against the live API** (no DB writes): bundle a tiny script
  with esbuild importing `functions/shared/*` and run it with
  `AUCTIONS_API_BASE_URL` + `AUCTIONS_API_KEY` set. (This is exactly how the
  field mappings in this repo were verified.)
- **DB upserts locally:** set `NEON_DATABASE_URL` to a dev branch and call the
  `db.ts` functions from a script.
- **State machine logic:** in the AWS console, use *Start execution* on
  `fullInventoryBackfill` with a small `perPage` (e.g. 5) to watch the loop.

---

## Logging & profiling

**Structured JSON logs.** Every Lambda logs single-line JSON via
[functions/shared/logger.ts](functions/shared/logger.ts), and the Lambdas run
with the nodejs20.x **native JSON `LoggingConfig`** (`logFormat: JSON`,
`applicationLogLevel: INFO`). Each line carries correlation context
(`flowType`, `syncRunId`, `page`, `mode`) so you can trace a whole run.

**Per-step timing.** `logger.time(name, fn)` wraps each fetch/upsert/archive
and emits `durationMs`. Example real line:

```json
{"level":"info","msg":"fetch_cars_page","flowType":"hourly_cars","syncRunId":999,"page":1,"perPage":3,"minutes":75,"durationMs":560.78}
```

**Querying (CloudWatch Logs Insights).** Examples:

```
# avg upstream fetch latency per flow
fields @timestamp, durationMs, flowType
| filter msg = "fetch_cars_page"
| stats avg(durationMs), max(durationMs) by flowType

# slow DB upserts
fields @timestamp, durationMs, page, carsIn
| filter msg = "upsert_cars_page" and durationMs > 1000
| sort durationMs desc

# all errors for one run
fields @timestamp, msg, error
| filter syncRunId = 1234 and level = "error"
```

**Durable run history.** The `sync_runs` table is the audit log: status,
pages/records processed, `last_page_processed`, `error_message`, timings. Query
it directly for sync health.

**Step Functions** log executions to CloudWatch at `ERROR` level with execution
data, and the visual graph shows per-state timing in the console.

**Set `LOG_LEVEL=debug`** (Lambda env var) to enable `logger.debug` lines.

> Not included by design (chosen scope): X-Ray tracing, CloudWatch alarms, and a
> dashboard. To add later: set `tracingConfig: { mode: "Active" }` on the Lambdas
> + `tracingConfiguration` on the state machines for X-Ray; add
> `aws.cloudwatch.MetricAlarm` on Lambda `Errors`/`Throttles` and on a custom
> "sync failed" metric.

## Resume / checkpointing

v1 is intentionally simple: every paginated step writes `last_page_processed`,
`pages_processed`, and `records_processed` to the run's `sync_runs` row. To
resume a failed backfill, read its `last_page_processed` and start a new
execution at `page = that + 1` (see `start-backfill.ps1 -StartPage`).
`functions/shared/syncRun.ts#findResumePoint` returns the latest unfinished run
for a flow, which a future version can use to auto-resume.

---

## Tradeoffs & design decisions

**Step Functions instead of one big Lambda.** A full backfill can span thousands
of pages at 1 req/sec — far beyond Lambda's 15-minute limit. Step Functions own
the long-running loop, give native retry/backoff for 429/5xx, make the `Wait 1s`
a first-class state, and surface execution state for debugging. Each Lambda stays
short, stateless, and independently retryable.

**Fetch + upsert in ONE Lambda per page (not two).** A page of 1000 cars with
full `lots`/`images` is several MB. AWS Lambda caps a synchronous response at
6 MB and Step Functions caps state at 256 KB, so returning the page from a
"fetch" Lambda and passing it through state to a separate "upsert" Lambda fails
with `Function.ResponseSizeTooLarge`. The merged `syncCarsPage` /
`syncArchivedLotsPage` Lambdas fetch and write in the same invocation; only small
loop-control fields (page, hasNextPage, counters) ever cross SFN state. This is
the standard fix for the "don't pass bulk payloads through Step Functions"
anti-pattern.

**Page fetching is serialized (no Map/parallel).** The rate limit is 1 req/sec.
A single sequential loop with a `Wait` between fetches is the only way to honor
that across a distributed system; parallel fetches would blow the limit and get
429-throttled. The combined hourly machine also runs cars then archived lots in
series for the same reason.

**EventBridge for recurring flows.** Schedules are declarative, cheap, and
decoupled from the workflow logic — change `rate(1 hour)` in config without
touching code. Manual flows (backfill) simply have no schedule.

**Neon needs no Lambda VPC.** Neon is a public serverless Postgres reached over
TLS. Putting Lambdas in a VPC just to reach it would add a NAT gateway (cost),
slower cold starts, and ENI limits — all for no benefit. Lambdas use public
egress for both AuctionsAPI and Neon. We use the **pooled** Neon endpoint so
connection counts stay bounded.

**Frontend queries our DB, not AuctionsAPI.** This decouples our UX from supplier
latency/rate limits/outages, lets us index and join freely, keeps the API key
server-side only, and gives us full history via `raw_json`. AuctionsAPI is a sync
source, not a request-time dependency.

**Drizzle for shape, plain SQL for migrations.** Drizzle gives typed queries for
the app, but production DDL is a hand-maintained SQL file run by a tiny
idempotent runner — so deploys don't depend on a migration framework inside
Lambda.

---

## Reference-sync scaling (known limitation)

`syncReferenceData` walks manufacturers → models → generations at 1 req/sec in a
single Lambda. For the full catalog that can exceed the 15-min limit. v1 supports
`{ "maxManufacturers": N }` to bound one invocation; a future version should move
this into its own Step Functions loop (same pattern as the page loops).

---

## Security notes

- The API key and Neon URL live in **AWS Secrets Manager** (created by Pulumi)
  and are also injected as Lambda env vars from Pulumi config secrets. IAM scopes
  secret read access to those specific ARNs.
- **Rotate the AuctionsAPI key** if it was ever shared in plaintext (e.g. in
  chat/CI logs): set a new value with `pulumi config set --secret ...` and
  `pulumi up`.
- Never expose the API key to the frontend.
```
