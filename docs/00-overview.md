# 00 — Ingestion System Overview

> **Scope of these docs.** Docs `01`–`07` document the **data ingestion +
> infrastructure** half of the repo — how we consume the AuctionsAPI, what we
> store, how we compute our read models, and the AWS infra that runs it.
> [`08-web-all-cars-page.md`](08-web-all-cars-page.md) documents the **`apps/web`
> all-cars catalog** that consumes the read models (the page, filters, and the
> active/past views); [`09-web-authentication.md`](09-web-authentication.md)
> documents **auth (Auth.js)** and
> [`10-web-favorites.md`](10-web-favorites.md) the **favourites** feature on top of
> it; [`11-web-seo-and-indexing.md`](11-web-seo-and-indexing.md) documents the **as-built SEO
> & indexing**, and [`12-web-seo-strategy.md`](12-web-seo-strategy.md) the **SEO strategy /
> roadmap**. Web coding conventions live in `apps/web/CLAUDE.md` / `apps/web/AGENTS.md`; the
> former `ALL-CARS-PLAN.md` / `ALL-CARS-DB-DESIGN.md` design records are now folded
> into docs 02/05/08.

## What this system is

`selectauto.bg` is a vehicle-import business: cars from **Korea (ENCAR)** and
**USA / Canada (Copart + IAAI)** auctions. The ingestion system keeps a **Neon
Postgres** database continuously synchronized with vehicle auction data pulled
from a third-party aggregator, **AuctionsAPI** (`https://auctionsapi.com/api`),
which itself aggregates Copart, IAAI and Encar.

The website reads **only** from Neon. It never calls AuctionsAPI directly (with
one rate-limited exception — on-demand detail refresh, see
[04-ingestion-flows.md](04-ingestion-flows.md)). All upstream traffic goes
through the ingestion system so the **1 request/second** rate limit is honored
globally.

## The two questions these docs answer

1. **What are we consuming, how, and why?** → [01-auctionsapi-consumption.md](01-auctionsapi-consumption.md)
2. **What tables do we store and compute, and why?** → [02-data-model-and-tables.md](02-data-model-and-tables.md) and [05-projection-tables-car-listings.md](05-projection-tables-car-listings.md)

## High-level data flow

```mermaid
flowchart TD
  api["<b>AuctionsAPI</b> — Copart / IAAI / Encar aggregator<br/>https://auctionsapi.com/api · 1 req/sec · x-api-key"]

  subgraph aws["AWS — Step Functions (sequential, Wait 1s) + Lambda (Node 20, esbuild)"]
    f1["hourly combined sync<br/>cars → archived-lots · EventBridge rate(1h)"]
    f2["daily reference sync<br/>manufacturers → models → generations · rate(1d)"]
    f3["manual full backfill<br/>all active cars · started by operator"]
    f4["detail refresh worker<br/>SQS FIFO drain, conc=1 · on-demand (app)"]
    f5["weekly drift sweep<br/>recompute every car · cron(SUN 03:00) · DB-only, no API"]
  end

  subgraph neon["Neon Postgres — public endpoint, pooled / PgBouncer"]
    raw["<b>RAW (mirror)</b><br/>cars · auction_lots"]
    ref["<b>REFERENCE</b><br/>manufacturers · vehicle_models · vehicle_generations"]
    comp["<b>COMPUTED (read models)</b><br/>car_listings · car_listings_archived"]
    leads["<b>WEBSITE LEADS</b><br/>carfax_requests · inquiries"]
    obs["<b>OBSERVABILITY</b><br/>sync_runs"]
  end

  web["apps/web (Next.js) — reads Neon only"]

  api -->|"/cars · /archived-lots · /manufacturers<br/>/models · /generations · /search-lot · /search-vin"| aws
  aws -->|"raw pg upserts (ON CONFLICT)"| neon
  neon -->|"SELECT (single-table, keyset)"| web
```

> **Card images (updated 2026-07).** The web catalog loads each card image
> **directly from the source CDN** (Copart / IAAI / Encar) through a plain
> `<img>` — **not** through Vercel's image optimizer (which had been ~80% of the
> web bill). The `thumbnail_url` column was repurposed to hold the per-source
> ~500px card image URL, populated at ingestion by `cardImageUrl()` in
> [`normalize.ts`](../packages/functions/shared/normalize.ts). No baking, no S3,
> no CloudFront. See
> [04](04-ingestion-flows.md#card-image-url-populated-at-ingestion) and
> [08 §5](08-web-all-cars-page.md).

## The kinds of tables (why each exists)

The full per-table data dictionary lives in
[02-data-model-and-tables.md](02-data-model-and-tables.md) (18 tables). At a
glance, they fall into these categories:

| Kind | Tables | Populated by | Purpose |
|------|--------|--------------|---------|
| **Raw mirror** | `cars`, `auction_lots` | hourly cars sync, full backfill, detail refresh, archived sync | A faithful, idempotent mirror of upstream vehicle + lot data. Every row keeps `raw_json` so new columns can be backfilled without re-pulling from the API. |
| **Reference** | `manufacturers`, `vehicle_models`, `vehicle_generations` | daily reference sync | Brand/model/generation lookup tables. `cars` stores only external numeric ids (`manufacturer_id` etc.); names are resolved through these. |
| **Computed read models** | `car_listings`, `car_listings_archived` | recompute functions called from every write path | Pre-joined, pre-deduped, pre-computed **one-row-per-physical-car** projections that the website paginates single-table with zero joins. The expensive per-car collapse (`GROUP BY car_id`) times out on the ~1M-row live set, so it is materialized incrementally at write time. See [05](05-projection-tables-car-listings.md). |
| **Summary (the cache)** | `car_listing_counts`, `car_listing_facets` | maintained in the same transaction as the read models (via a snapshot-diff in the `_counted` recompute wrappers) | Make catalog counts and filter-dropdown facets **O(1)**: `counts(table_kind, dim, val, n)` powers `getCarsCount`; `facets(table_kind, dim, val, val2, n)` powers the filter dropdowns. Correct by construction — no periodic reseed. See [02](02-data-model-and-tables.md). |
| **Website leads** | `carfax_requests`, `inquiries` | the website backend (not ingestion) | Low-volume form submissions. Documented here only for completeness of the schema. |
| **Observability** | `sync_runs` | every sync flow | One row per sync execution: status, pages, records, errors, checkpoint. |

The database also holds **web-owned** tables that ingestion never touches —
Auth.js auth (`users`, `accounts`, `verification_tokens`,
`password_reset_tokens`) and user `favorites`, plus the `_migrations` ledger.
See [02-data-model-and-tables.md](02-data-model-and-tables.md).

## Key design facts (carried throughout these docs)

- **Rate limit = 1 req/sec, enforced globally.** Not per-Lambda. The Step
  Functions `WaitOneSecond` state paces page loops; the detail-refresh worker has
  `reservedConcurrency = 1` + a trailing sleep. See [04](04-ingestion-flows.md).
- **Pagination is Laravel `simplePaginate`** — there is **no** `total` /
  `last_page`. The next-page signal is `links.next` (URL or `null`). See [01](01-auctionsapi-consumption.md).
- **A page's data never leaves its Lambda.** A page of 1000 cars with lots/images
  exceeds Lambda's 6 MB response limit and Step Functions' 256 KB state limit, so
  fetch **and** write happen in one invocation; only small counters cross the
  state machine. See [04](04-ingestion-flows.md).
- **Lot identity = `(domain_id, lot_number)`.** Reliable even when external
  ids / VIN are missing or duplicated. This is the upsert conflict key.
- **A car can have many lots (1 → N).** ~94% have one lot; tens of thousands have
  2–14 (relisted / withdrawn, sometimes across Copart + IAAI). `cars` = the
  physical vehicle; `auction_lots` = each listing. The read models collapse this
  back to one card per car. See [05](05-projection-tables-car-listings.md).
- **Never assume a field exists.** Normalization guards every access; missing →
  `null`. See [03](03-normalization-and-field-mapping.md).

## Where things live in the repo

| Path | What |
|------|------|
| `packages/functions/shared/` | API client, normalizers, DB layer, logger, pagination — the ingestion core |
| `packages/functions/<name>/handler.ts` | One Lambda handler per sync flow |
| `packages/functions/build.mjs` | esbuild bundler (one ESM file per handler) |
| `packages/db/schema.ts` | Drizzle schema (source of truth for table SHAPE + typed queries) |
| `packages/db/migrations/*.sql` | Plain-SQL migrations (what actually runs in prod) |
| `packages/db/migrate.mjs` | Minimal append-only migration runner |
| `packages/db/backfill-car-listings.mjs` | Projection backfill / drift-repair — rebuilds **both** read models via `--fn`; default calls the `_counted` wrapper so counts + facets stay in sync |
| `packages/db/reseed-summaries.mjs` | Authoritative reseed of the summary tables (`--check` = drift / negative-`n` diagnostic). Only needed after a deliberate recompute-logic change |
| `packages/db/backfill-card-images.mjs` | One-time: backfill `auction_lots.thumbnail_url` with the per-source card image URL (mirrors `cardImageUrl()` server-side) |
| `infra/src/` | Pulumi TS — Lambdas, Step Functions, schedules, IAM, secrets, SQS, S3 (the documents bucket for contracts & payments) |
| `apps/web/` | Next.js frontend (reads Neon). The all-cars catalog → [08](08-web-all-cars-page.md). |
| `docs/` | These docs + `sample-cars-response.json` (a real `/api/cars` record) |

## Reading order

1. [01-auctionsapi-consumption.md](01-auctionsapi-consumption.md) — the upstream contract
2. [02-data-model-and-tables.md](02-data-model-and-tables.md) — what we store
3. [03-normalization-and-field-mapping.md](03-normalization-and-field-mapping.md) — raw → rows
4. [04-ingestion-flows.md](04-ingestion-flows.md) — how data moves (6 flows: 5 API-driven write paths + the weekly DB-only drift sweep)
5. [05-projection-tables-car-listings.md](05-projection-tables-car-listings.md) — what we compute
6. [06-infrastructure-aws-pulumi.md](06-infrastructure-aws-pulumi.md) — the AWS/Pulumi layer
7. [07-operations-runbook.md](07-operations-runbook.md) — build, deploy, migrate, troubleshoot
8. [08-web-all-cars-page.md](08-web-all-cars-page.md) — the website catalog that consumes the read models
9. [09-web-authentication.md](09-web-authentication.md) — auth (Auth.js): Google + email/password
10. [10-web-favorites.md](10-web-favorites.md) — the favourites feature
11. [11-web-seo-and-indexing.md](11-web-seo-and-indexing.md) — SEO & indexing (hubs, sitemaps, 410, GEO)
12. [12-web-seo-strategy.md](12-web-seo-strategy.md) — SEO strategy: market research, keywords, roadmap
13. [13-seo-action-plan.md](13-seo-action-plan.md) — the consolidated SEO execution checklist
14. [14-market-research-2026-08.md](14-market-research-2026-08.md) — **first real-data market snapshot** (absolute BG volumes, real Google.bg SERPs, competitor traffic + backlinks). Supersedes the proxy-based figures in 12 where they conflict — see its §7.
