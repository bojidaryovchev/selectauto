# selectauto — project context for Claude

This file loads into Claude's context automatically at the repo root, so anyone
who clones the repo and runs Claude Code here gets the same project understanding.
Keep it short and current; the depth lives in `docs/` and `README.md`.

## What this is

`selectauto.bg` is a vehicle-import business (Korea via ENCAR + USA/Canada via
Copart/IAAI auctions). This **pnpm monorepo** (`apps/*`, `packages/*`, `infra`) is:

1. **An ingestion system** — keeps a **Neon Postgres** DB continuously synced with
   vehicle auction data from **AuctionsAPI** (a Copart/IAAI/Encar aggregator).
   AWS Lambda (Node 20) + Step Functions + EventBridge + SQS, deployed by Pulumi.
2. **A Next.js website** (`apps/web`) that reads **only** from Neon (never
   AuctionsAPI directly), incl. the all-cars catalog at `/vsichki-avtomobili`.

## Read the docs before working — they are the source of truth

`docs/` is comprehensive and current. **Read the relevant doc before changing
code in its area** (don't work from assumptions about how the system behaves):

| Doc | Topic |
|---|---|
| [docs/00-overview.md](docs/00-overview.md) | System overview, table kinds, where things live |
| [docs/01-auctionsapi-consumption.md](docs/01-auctionsapi-consumption.md) | The upstream API contract (auth, rate limit, pagination, payloads, **enum tables**) |
| [docs/02-data-model-and-tables.md](docs/02-data-model-and-tables.md) | Every table + column + **migration history** |
| [docs/03-normalization-and-field-mapping.md](docs/03-normalization-and-field-mapping.md) | raw payload → DB rows |
| [docs/04-ingestion-flows.md](docs/04-ingestion-flows.md) | The 5 write paths + Step Functions |
| [docs/05-projection-tables-car-listings.md](docs/05-projection-tables-car-listings.md) | The computed read models (`car_listings` / `car_listings_archived`) |
| [docs/06-infrastructure-aws-pulumi.md](docs/06-infrastructure-aws-pulumi.md) | The AWS/Pulumi layer |
| [docs/07-operations-runbook.md](docs/07-operations-runbook.md) | Build, deploy, migrate, resume, troubleshoot |
| [docs/08-web-all-cars-page.md](docs/08-web-all-cars-page.md) | The website catalog (page, filters, active/past views) |

Also: [README.md](README.md) (repo structure), and `apps/web/AGENTS.md` (the web
app's own conventions — **this Next.js version has breaking changes vs. training
data; read `node_modules/next/dist/docs/` before writing web code**).

## Load-bearing facts (the ones easy to get wrong)

- **1 req/sec global rate limit** to AuctionsAPI — enforced by the orchestrator
  (Step Functions `Wait 1s`, sequential hourly machine, single-concurrency detail
  worker). The website never hits AuctionsAPI directly.
- **Pagination is Laravel `simplePaginate`** — no `total`/`last_page`; `links.next`
  is authoritative.
- **`cars` (physical vehicle) → `auction_lots` (a listing) is 1→N.** A car can have
  many lots (relisted). Lot identity = `(domain_id, lot_number)` (the upsert key).
- **`car_listings` / `car_listings_archived`** are computed read models: one row per
  physical car, maintained incrementally by `recompute_*` SQL functions called from
  the two write functions in `packages/functions/shared/db.ts`. They are kept
  **disjoint** (a car is active XOR past). The website paginates them single-table,
  zero joins, keyset on `sort_id`.
- **i18n: store raw canonical English, translate in the app** (`apps/web/src/lib/
  car-labels.ts`). Never store Bulgarian in the DB (facets group by raw value).
- **Migrations are append-only + hand-run** (`pnpm migrate`) — never auto-applied
  on deploy. Lambda code changes ship via `pnpm run deploy` (bundle hash → `pulumi
  up`, no infra edit).

## Conventions

- **Windows / PowerShell** dev environment. Use `$env:VAR = "..."` (not `VAR=...`).
- Secrets (`AUCTIONS_API_KEY`, `NEON_DATABASE_URL`) come from Pulumi config /
  Secrets Manager → Lambda env vars; locally from the repo-root `.env`
  (auto-loaded by the migrate/backfill scripts). **Never commit secret values.**
- Pulumi: S3 state backend, SSO locally / GitHub OIDC in CI, region `eu-central-1`
  (see docs/06).
