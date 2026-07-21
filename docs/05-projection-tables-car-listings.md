# 05 — Computed Read Models: `car_listings` & `car_listings_archived`

This is the "**what tables we compute, how & why**" deep-dive. These two tables
are the only **derived** data in the system — everything else mirrors upstream.
They exist so the website can render its catalog from a single table with no joins
and no query-time deduplication.

Source: migrations
[`0006`](../packages/db/migrations/0006_car_listings.sql),
[`0007`](../packages/db/migrations/0007_recompute_car_listings.sql),
[`0008`](../packages/db/migrations/0008_car_listings_indexes.sql),
[`0009`](../packages/db/migrations/0009_car_listings_engine.sql),
[`0010`](../packages/db/migrations/0010_car_listings_archived.sql),
[`0011`](../packages/db/migrations/0011_car_listings_archived_indexes.sql),
[`0012`](../packages/db/migrations/0012_archived_concluded_only.sql),
[`0014`](../packages/db/migrations/0014_listings_vehicle_body_type.sql) (adds
`vehicle_type`/`body_type` to both projections + redefines both recompute fns),
[`0020`](../packages/db/migrations/0020_listing_fuel_type.sql) (adds `fuel_type` +
a `fuel` facet),
[`0022`](../packages/db/migrations/0022_recompute_restore_type_columns.sql) (fixes
a regression 0020 introduced — see §6),
[`0023`](../packages/db/migrations/0023_archived_at.sql) (set-once `archived_at` on
the archived projection);
backfill [`backfill-car-listings.mjs`](../packages/db/backfill-car-listings.mjs);
recompute hooks in [`shared/db.ts`](../packages/functions/shared/db.ts).

---

## 1. The problem these tables solve

The website's all-cars grid needs **one card per physical car**, filtered,
sorted, and paginated over ~1M rows. But the raw data fights that:

1. **A car has many lots** (1 → N). ~94% have one lot; **71,226 cars have 2–14
   lots** — the same car relisted/withdrawn, sometimes across Copart + IAAI. A
   card must show **one** lot per car, so the grid needs a per-car collapse.
2. **`cars` has no make/model text** — only external `manufacturer_id`/`model_id`.
   Naïve filtering needs joins to `manufacturers` (424) / `vehicle_models` (~3400).
3. **Three measured failures of doing it on the fly** (live Neon):
   - Filters split **both** tables but the sort key lives on `auction_lots` → no
     index spans the join → `EXPLAIN` showed scan-and-discard (brand=BMW: 2736
     probes for 25 rows).
   - A filtered `COUNT` seq-scans `cars`.
   - **The per-car dedupe `GROUP BY car_id` TIMED OUT** on live Neon.
4. **`sale_date` exists on only ~14%** of active lots and **prices on only ~31%**
   → neither is a usable global key without precomputation.

**Decision:** do the collapse **once, at write time**, into a real table — not a
Postgres `MATERIALIZED VIEW` (a full `REFRESH` re-runs the timeout-prone collapse
wholesale), and not on-the-fly joins. The website then queries a single table with
composite `(filter_col, sort_id DESC)` indexes and a **keyset cursor** (OFFSET
pagination is unusable at this scale).

---

## 2. What "one row per car" means

| Concept | Table | Meaning |
|---|---|---|
| physical vehicle | `cars` | intrinsic attributes (title/year/brand/model/color/engine/trans/drive/vin) |
| a listing | `auction_lots` | lot_number/domain/prices/buy_now/sale_date/condition/damage/seller/odo/image |
| **a card (active)** | `car_listings` | the car + its **one chosen** active lot |
| **a card (past)** | `car_listings_archived` | the car + its **one chosen** concluded lot |

Per-car grid ≈ **935,500 active cards** (vs ~998k active lots-with-image).

---

## 3. Membership rules (who gets a row)

| | `car_listings` (active) | `car_listings_archived` (past) |
|---|---|---|
| lot `archived` | `= false` | `= true` |
| lot `image_url` | `IS NOT NULL` | `IS NOT NULL` |
| lot `status` | any (pick prefers actionable) | **`IN (sold, not_sold, failed)`** (concluded only, since 0012) |
| disjointness | — | **AND NOT** (car has any active+image lot) |

The two tables are kept **strictly disjoint** — a car is **active XOR past**.
Every write path recomputes **both** so a lot changing state *moves* the car
between tables (and removes it from the other). This disjointness was a bug source
twice (a 1009-row overlap, then a later overlap) — now enforced by the `NOT
EXISTS` clause in the archived function + both recomputes running on every write.

---

## 4. Pick-strategy (which lot represents a multi-lot car)

Both functions use `SELECT DISTINCT ON (al.car_id) ... ORDER BY al.car_id, <rank>`
to choose exactly one lot per car. The **rank** differs by table because the two
views want different things:

### Active — "actionable-first" (most useful live listing)
```sql
ORDER BY
  al.car_id,
  (al.status IN ('sale','upcoming','future','on_approval','new_auction')
   OR (al.buy_now = true AND al.buy_now_price > 0)) DESC,   -- live/biddable first
  al.sale_date ASC NULLS LAST,                              -- soonest auction
  al.id DESC                                                -- newest listing tiebreak
```
99.3% of multi-lot cars have a usable lot under this rule. Two live-probed invariants
keep the pick + channel logic sound: `buy_now = true ⇒ buy_now_price > 0` on **100%** of
active lots (a BUY-NOW card always has a price; the channel predicate is safe), and
`car_id` is non-null on **100%** of active image-bearing lots (every listing becomes a
card — the `car_id`-keyed table never silently drops rows). In practice the pick-strategy
mostly only disambiguates auction-relisted cars, because channel/market partition the set
into page tabs (only 45 cars are both buy-now and auction — see
[08 §3](08-web-all-cars-page.md#3-filters-every-filter--a-single-car_listings-column)).

### Archived — "most-recent-result" (latest known outcome)
```sql
ORDER BY
  al.car_id,
  (al.status = 'sold') DESC,        -- a confirmed sold result first
  al.sale_date DESC NULLS LAST,     -- most recent outcome
  al.id DESC
```

---

## 5. Computed columns

Both tables carry the same shape (see [02](02-data-model-and-tables.md) for the
full column list). The **derived** parts:

- **`sort_id` = chosen `lot_id`** (`auction_lots.id`). Monotonic + unique, so it
  doubles as the **keyset cursor** and the newest-first ordering key. (The
  all-cars list can't sort by `sale_date` — only 14% have one — so it sorts by id.)
- **`effective_price`** — collapses the legacy price precedence into one column
  (zeros nulled), differing by table to match each view's meaning:
  - active: `COALESCE(NULLIF(buy_now_price,0), NULLIF(final_bid,0), NULLIF(bid_price,0))`
  - archived: `COALESCE(NULLIF(final_bid,0), NULLIF(buy_now_price,0), NULLIF(bid_price,0))`
    — for a sold car the realized price is `final_bid`, so it's preferred.
- Filter columns (`manufacturer_id`, `model_id`, `car_year`, `car_color`,
  `drive_wheel`, `vehicle_type`, `body_type`, `fuel_type`, `vin`) come from
  **`cars`** (`fuel_type` since 0020 — powers the "Гориво" filter); lot-derived
  filter/display columns
  (`buy_now`, `domain_name`, `location_country`, `lot_number`, prices, image,
  `thumbnail_url`, odometer, sale_date, status, condition, damage_main, seller)
  come from the **chosen lot** (`thumbnail_url` projected from the chosen lot's
  `auction_lots.thumbnail_url` alongside `image_url`, since 0035 — NULL until the
  `bakeThumbnail` worker bakes it); `title`/`engine`/`transmission` come from `cars`.
  `car_listings_archived` additionally carries a **set-once `archived_at`** (0023,
  see §6) projected from the chosen lot's `archived_at`.

### Why brand/model NAMES are deliberately absent
The **daily reference sync** can rename a manufacturer/model **without touching any
lot** — so a per-lot recompute hook would never refresh a denormalized name,
leaving it stale forever. The tables store only `manufacturer_id`/`model_id`;
names are resolved at **read time** via a cached id→name lookup in the app. This
closes the only staleness gap (everything else recomputes via the two db.ts hooks).
`engine`/`title`/`transmission`/`vehicle_type`/`body_type`/`fuel_type` are safe to
denormalize because they live on `cars` and the reference sync doesn't touch them.

---

## 6. The recompute functions (single source of truth)

`recompute_car_listings(int[])` and `recompute_archived_car_listings(int[])` are
the **only** writers of these tables, shared by the backfill **and** the ingestion
hooks so the pick-strategy can never drift. Each function, given a batch of car
ids:

1. **Upserts** rows for batch cars that have a qualifying lot (`DISTINCT ON` pick
   → `INSERT ... ON CONFLICT (car_id) DO UPDATE SET <all columns>`).
2. **Deletes** rows for batch cars that no longer qualify (e.g. the only active lot
   was just archived, or — for archived — the car became active again, or its lot
   is no longer a concluded status).

Properties (all deliberate):
- **Set-based, plain SQL** — PgBouncer transaction-pooling safe (no named prepared
  statements). One round-trip per batch.
- **Idempotent + order-independent** — reads CURRENT state, writes the whole row.
  Safe to over-call (e.g. a Step Functions page retry).
- **Fast** — ~160ms for a ~991-car page; a 1000-lot page yields ~992 distinct
  car_ids → one `WHERE car_id = ANY($1)` statement.
- **`CREATE OR REPLACE`** — re-running the migration just refreshes the definition.

### Definition history (why the current bodies look the way they do)
Because every recompute definition is a `CREATE OR REPLACE` applied in lexical
migration order, a later migration that rebases on an *older* body silently reverts
whatever the intervening migrations added. That is exactly what happened once:

- **0020** added `fuel_type`, but rebased both functions on their old **0009/0010**
  bodies — silently reverting **0014**'s `vehicle_type`/`body_type` columns (so
  newly-inserted cars landed `NULL` and vanished from the "Тип" facet/filter) **and**
  **0012**'s archived **concluded-only** filter (`status IN ('sold','not_sold','failed')`),
  letting non-concluded lots leak back into `car_listings_archived`.
- **0022** fixes this by redefining both functions as the **union** of 0014
  (`vehicle_type`/`body_type` + the concluded-only filter) **and** 0020 (`fuel_type`).
  This is why the live bodies project all of `engine`, `vehicle_type`, `body_type`,
  `fuel_type` and the archived `chosen` CTE / DELETE both carry the concluded-only
  `status` clause. Applying 0022 requires a re-populate (chunked backfill via the
  `_counted` wrappers, or the weekly drift sweep) — see [07](07-operations-runbook.md).
- **0023** then re-defines only the **archived** function once more, rebasing on
  0022's corrected body and adding **`archived_at`**: projected from the chosen lot's
  `auction_lots.archived_at`, stamped on first INSERT and **preserved on conflict**
  (`archived_at = COALESCE(existing, EXCLUDED)`) while `updated_at` still bumps to
  `now()` every recompute. It records *when a lot was archived* (the age signal the
  SEO 410 policy needs), not "last touched by ingestion".
- **0035** redefines **both** functions once more — the active on 0022's body, the
  archived on 0023's — to thread **`thumbnail_url`** from the chosen lot's
  `auction_lots.thumbnail_url` through the `chosen` CTE, INSERT list, SELECT and
  `ON CONFLICT` SET (following `image_url`). The `_counted` wrappers are untouched
  (a thumbnail never changes counts/facets). NULL until the `bakeThumbnail` SQS
  worker bakes the card thumbnail to S3+CloudFront (so the catalog grid bypasses
  Vercel Image Optimization — ~80% of the web bill); the card falls back to the
  optimized `image_url` meanwhile.

---

## 7. How they stay live (the ingestion hooks)

In [`shared/db.ts`](../packages/functions/shared/db.ts), both write functions
collect touched car ids during their per-row loop, then call **both** recomputes
once at the end (set-based, never per-row — the Lambda pool is `max 2`):

```ts
// The *_counted wrappers (migrations 0016/0017) — they maintain car_listings /
// car_listings_archived AND car_listing_counts / car_listing_facets in one txn.
await recomputeListings(client, "recompute_car_listings_counted", touchedCarIds);
await recomputeListings(client, "recompute_archived_car_listings_counted", touchedCarIds);
```

The `_counted` wrappers call the bare recompute functions above, then maintain
`car_listing_counts` + `car_listing_facets` in the **same transaction** via a
before/after snapshot-diff (`n += after − before`). Since **0026** each wrapper first
takes a transaction-scoped advisory lock (`pg_advisory_xact_lock`, one shared key
across both wrappers) so overlapping recomputes — e.g. a backfill or off-cycle drift
sweep racing the live hourly sync under READ COMMITTED — can't both apply a delta for
the same change. This makes the snapshot → recompute → snapshot → apply sequence
atomic w.r.t. any other maintenance, so the summaries are **correct by construction**
with no periodic reseed (details in [02](02-data-model-and-tables.md) /
[07](07-operations-runbook.md)).

- `upsertCarsAndLots` (Flows 1/2/5): a car re-seen in `/cars` is active → lands in
  `car_listings` and (if present) drops out of `car_listings_archived`.
- `archiveLots` (Flow 3): uses `RETURNING car_id` to learn which **local** cars
  changed, then the archived lot drops/swaps the active card and adds/refreshes the
  past card.

`recomputeListings` is **best-effort**: a recompute failure is logged and
swallowed — it must **not** fail the page, because the `cars`/`auction_lots` writes
already succeeded and are the source of truth (the next sync / the weekly drift
sweep re-derives the projections). It also de-dups + filters non-integer ids and
no-ops on an empty set.

> **Coverage:** Flows 1/2/3/5 maintain the read models automatically via these two
> hooks. Flow 4 (reference) intentionally does **not** touch them (which is exactly
> why names aren't denormalized — see §5).

---

## 8. Backfill (one-time / drift repair)

[`backfill-car-listings.mjs`](../packages/db/backfill-car-listings.mjs) calls the
**same** recompute function over **every** car id, in batches, via a **keyset walk
on `cars.id`** (ids are sparse — id-range stepping would waste thousands of empty
batches):

```bash
# active table (default)
node --env-file-if-exists=../../.env backfill-car-listings.mjs
# past/sold table
node --env-file-if-exists=../../.env backfill-car-listings.mjs --fn=recompute_archived_car_listings
# tuning
node ... backfill-car-listings.mjs --batch=25000 --start=0 --sleep=50
```

- `--fn` selects which projection (`recompute_car_listings` → `car_listings`, or
  `recompute_archived_car_listings` → `car_listings_archived`).
- `--batch` (default 25000) = car-id window per recompute call; `--start` resumes
  from a car id; `--sleep` (default 25ms) spares the DB/ingestion.
- **Write-isolated** to the target projection; only **reads** `cars`/`auction_lots`
  — safe to run against prod while ingestion runs (recompute is idempotent +
  order-independent). `SET statement_timeout = 120000` gives cold id-range scans
  room.

Measured backfills (2026-07): ~942k active rows; ~429k archived rows (sold-first).
The archived table grows steadily as auctions conclude (it was ~144k in mid-2026).

---

## 9. Indexes & query pattern

Indexes (migrations 0008 / 0011) are created **after** the backfill so the bulk
load isn't index-maintained per row. Each composite **leads with a filter column
and ends in `sort_id DESC`**, so the listing query —

```
WHERE <filters> AND sort_id < $cursor   -- keyset
ORDER BY sort_id DESC
LIMIT n
```

— walks the index in output order and stops at `LIMIT`: **flat cost at any page
depth, no seq scan, no cross-table work**. Multi-filter combos use one composite
for the leading equality column and filter the rest in-scan / BitmapAnd; we
deliberately do **not** pre-build every combination. `drive_wheel` (3 values) /
`transmission` (2) are too low-selectivity to index — they filter in-scan.
`lot_number` uses `text_pattern_ops` (prefix search); `vin` is plain.

---

## 10. Storage cost (addressing "isn't a new table 2× storage?")

**No.** `auction_lots` measures ~5.9 GB but **88.5% (~5.24 GB) is TOAST =
`raw_json`**, which the projection tables do **not** copy. The real heap is ~555
MB. `car_listings` ≈ **~0.5 GB total (~+4% on the DB)** — about the same as plain
column-denormalization would add. Storage is a **wash**; the projection table wins
on **correctness** (per-car dedupe without a timing-out query), not storage.

---

## 11. Production-safety properties

- **Purely additive** — new tables + new indexes + an appended recompute step in
  the two ingestion functions. Does **not** alter/drop anything in
  `cars`/`auction_lots`; existing reads and running syncs are unaffected.
- **Fully reversible** — `DROP TABLE car_listings[_archived]` + revert the two
  db.ts hook lines.
- **Backfill is a standalone resumable script**, not part of any migration.

---

## 12. Known gaps / follow-ups

- **Drift sweep — DONE (migration-free, infra).** A **weekly** drift-repair sweep
  now re-runs the projection recompute over **every** car via the same
  `recompute_*_counted` wrappers (so counts + facets are repaired too), catching
  any best-effort recompute that was swallowed during ingestion. It is a Step
  Functions loop (`<prefix>-drift-sweep`) processing one car-id keyset window per
  step (resumable, idempotent), triggered by the `weekly-drift-sweep` EventBridge
  schedule (Sunday 03:00 UTC by default). Handlers:
  [`driftSweep/handler.ts`](../packages/functions/driftSweep/handler.ts); infra in
  [`infra/src/step-functions.ts`](../infra/src/step-functions.ts) +
  [`schedules.ts`](../infra/src/schedules.ts). Weekly (not nightly) is sufficient:
  the hourly sync already recomputes touched cars; the sweep only mops up the rare
  swallowed failure (the audit found 9 such rows out of ~148k). A full walk is
  ~14 min of DB work, which is why it loops rather than running in one Lambda.
- **`car_listings` is only kept live once the ingestion hooks are deployed**
  (`pulumi up` after the db.ts changes). Until then it's a static backfilled
  snapshot.
- **Card parity ~95%** — `seller_type` ("Тип продавач") and image galleries are
  not in Neon yet (noted API follow-ups). The past view is intentionally
  `noindex` (~429k thin sold-car URLs would be a programmatic-SEO liability); the
  indexable SEO play is a future model-level price-stats page using `/statistics`.
