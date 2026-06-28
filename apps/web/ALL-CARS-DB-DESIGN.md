# All-Cars filtering — DB design: the `car_listings` projection table

Companion to `ALL-CARS-PLAN.md`. Data-layer decision record for the
`/vsichki-avtomobili` page: the read model, every filter, indexing, and how the table is
kept in sync with ingestion.

> ## Past/sold view + SEO (built — `?status=past`)
> A second projection table **`car_listings_archived`** (migrations 0010–0012) powers the
> "Приключили" toggle: one row per physical car whose chosen lot has a **concluded** status
> (`sold`/`not_sold`/`failed`) — ~144k rows, sold-first. Same shape/indexes/recompute pattern
> as `car_listings`; maintained by the hourly `/archived-lots` sync (both write paths now call
> BOTH `recompute_car_listings` and `recompute_archived_car_listings`, keeping the two tables
> **disjoint** — a car is active XOR past). The queries switch table on `filters.status`.
> Card renders in "past mode" (Продаден + realized price, no phone/Viber/countdown/CTA).
>
> **SEO decision (deliberate):** the past *browse* view is **`noindex, follow`**. Reason: ~144k
> thin, fast-decaying, non-actionable sold-car URLs are exactly the programmatic-SEO pattern
> Google penalizes (Dec 2025 E-E-A-T) and would waste crawl budget. Users get it as a
> price-research utility; crawlers follow through but don't index it. **The indexable SEO play
> is a FUTURE feature, NOT built:** model-level **auction-price pages** ("BMW 530 цени от
> търг" → avg/min/max/count + recent examples from this archive, `Product`/`AggregateOffer`
> JSON-LD, in the sitemap). The data supports it (133k sold lots w/ final price, rolling
> ~12-month window). The AuctionsAPI `/statistics` endpoint also returns avg price by
> model/year/platform. That's where past data *earns* organic + AI-citation traffic.

Grounded in live `EXPLAIN ANALYZE` + distribution probes against production Neon (not
assumptions). Numbers are as of the probe; orders of magnitude are what matter.

**Decisions locked with the user:**
- A card = **one physical car** (not one auction lot) — relisted cars must not duplicate.
- Read model = a **dedicated `car_listings` table** (a "materialized view as a real
  table", maintained by ingestion), queried with **zero joins**.

---

## 1. Why two source tables exist (and why we project off them)

The AuctionsAPI `/cars` payload is a **car** with a nested `lots[]` array. Ingestion
splits it:

- **`cars`** — one row per *physical vehicle* (VIN). Intrinsic, listing-independent:
  `title, year, manufacturer_id, model_id, color, engine, transmission, drive_wheel, vin`.
- **`auction_lots`** — one row per *listing of that car at an auction*. Listing-specific:
  `lot_number, domain_name (copart/iaai/encar), buy_now + prices, sale_date, status,
  condition, damage_main, seller, odometer_km, image_url`. FK `car_id → cars.id`.

Relationship is **1 car → N lots** (measured: 94% of cars have 1 lot, but **71,226 cars
have 2–14 lots** — same physical car relisted/withdrawn/re-listed, sometimes across
copart+iaai). So the tables are genuinely not 1:1; the split is correct.

The page shows **vehicles**, but each card needs *both* intrinsic (`cars`) and listing
(`auction_lots`) fields, and must collapse the N lots of a relisted car to **one** card.
That collapse is the expensive part — see §3.

### §1b. AuctionsAPI contract — confirmed findings (read the full API reference)

Read end-to-end against our implementation. What it confirms / changes:

- **Two-endpoint model (matches us):** `/api/cars` = active inventory (first import + hourly
  `minutes` updates); `/api/archived-lots` = "cars that were sold or archived… remove from
  active catalog or move to an archive table." Our hourly cars+archived flow is the
  documented pattern verbatim.
- **`lot.archived` (boolean) + `lot.archived_at` exist on every lot** — see §7: we must
  **persist** these (currently `upsertCarsAndLots` ignores `raw.archived`). This is the
  correct, contract-based fix for the archive question.
- **Pagination:** `simple_paginate=1` is the **default** (no `total`/`last_page`) — matches
  our loop. `simple_paginate=0` adds total count (could power an exact result count cheaply
  if ever wanted — but our cached `COUNT` is fine).
- **`seller_type` IS available** (`SellerTypeEnum: insurance=1, non_insurance=2`, `lot.seller_type`).
  → The card's "Тип продавач" row is **recoverable** (plan said "drop — not in Neon"). We'd
  need to add `seller_type` to `normalizeLot` + a column; defer to a follow-up unless wanted
  now. Updates plan §1 parity (was ~95%; the only true gap left is multi-image galleries).
- **Canonical enum tables** (authoritative IDs): `status` 1–8, `condition` 0–7, `color`
  1–19, `body_type`, `fuel` 1–7, `transmission` 1–2, `drive_wheel` 1–3, `vehicle_type`,
  `seller_type`, `odometer.status`, `airbags`. Our `car-labels.ts` BG maps should key off
  these canonical **names** (we store names, not ids) — and the enum list guarantees our
  maps are COMPLETE (e.g. condition has exactly 8 values; status exactly 8). No surprise tail.
- **`status` semantics (sharpens pick-strategy "actionable"):** active-ish = `sale(3)`,
  `on_approval(4)`, `new_auction(5)`, `future(9)`, `upcoming(10)`; concluded = `sold(6)`,
  `failed(7)`, `not_sold(8)`, `not_on_sale(2)`, `not_checked(1)`. (Note: `new_auction` and
  `failed` weren't in our live sample but ARE valid — add to the actionable/terminal sets.)
- **Native filter params for EVERY filter we need** (so facets can use canonical ids):
  `manufacturer_id`, `model_id`, `from_year/to_year/year`, `color`, `transmission`,
  `drive_wheel`, `buy_now`, `buy_now_price_from/to`, `bid_price_from/to`, `country`
  (US/CA/KR → confirms market=`location_country`), `status[]`, `name`, `vin`, `damage`.
  We don't call the API at read time (we read `car_listings`), but this confirms our filter
  set is first-class in the source and our column choices line up 1:1.
- **Detail lookups** `/search-lot/{lot}/{domain}` + `/search-vin/{vin}` (`prices_history=1`)
  power the future detail page; already wired via the SQS refresh path.

---

## 2. The dataset, measured

| Metric | Value |
| --- | --- |
| `auction_lots` rows | **1,178,228** (heap 538 MB, total **5.9 GB**) |
| `cars` rows | **1,100,191** (heap 326 MB, total **6.8 GB**) |
| Active lots (`archived=false`, `image_url IS NOT NULL`) | **998,426** |
| **Distinct cars** with an active+img lot (**= card count**) | **935,500** |
| Duplicate lots removed by per-car dedupe | ~63k |
| Active lots with `sale_date` | **14%** ← not a viable global sort |
| Active lots with any price > 0 | **31%** ← collapse 3 price cols → one |
| `buy_now` (active+img) | false 705,877 · true 274,819 · null 17,694 |
| Market (`location_country`, active+img) | USA 745k · kr 233k · Canada 12k · rb 2.8k — backs the САЩ/Корея/Канада tabs (NOT `domain_name`, which is the auction site) |
| Channel (per car) | buy-now-only 210k · auction-only 703k · **both 45** → channel/market belong as page-level **tabs**, not per-card |
| Distinct brands / models present (active) | 146 / 1,527 |
| Top brand share | Hyundai 10.6% · Kia 9.6% · … · BMW 3.4% (none dominates) |
| Facet value cleanliness | already clean enums (color, drive=front/all/rear, year ints) — ingestion `normalize.ts` cleaned them; **no WP-style normalization needed** |

**Existing indexes:** `auction_lots` pkey(id), unique(domain_id,lot_number), (car_id),
(status), (archived); `cars` pkey(id), unique(external_car_id), (vin). **None supports a
listing filter.** No index helps the per-car collapse.

---

## 3. Why on-the-fly (no projection) fails — measured

The page sorts/paginates over vehicles while filters straddle both tables AND must
dedupe N lots → 1 per car. Three independent problems, all observed:

1. **Cross-table filter + sort can't share an index.** Filters `brand/model/color/year/
   drive` live on `cars`; sort key lives on `auction_lots`. `EXPLAIN` on `brand=BMW`
   ordered by `auction_lots.id`: **scan-and-discard nested loop** — 2,736 row probes to
   return 25 (3,238 disk reads). Worse for rarer filters / deeper pages.
2. **Filtered `COUNT` seq-scans `cars`** (~102k buffers, 326 MB).
3. **The per-car dedupe itself times out.** `SELECT count(*) ... GROUP BY car_id HAVING
   count(*)>1` over the active set **hit the statement timeout** on live Neon. A
   `DISTINCT ON (car_id) ... ORDER BY car_id, <pick>` per request is exactly this cost on
   every page load — untenable.

→ The collapse must happen **once, at write time**, into a table with **one row per
displayable car**. That table is `car_listings`.

---

## 4. The `car_listings` table

One row per **physical car that has at least one active, image-bearing lot**. Holds
everything the card + filters need, pre-joined and pre-computed. The page reads this
table **only** — no join to `cars`/`auction_lots` on the hot path.

```sql
CREATE TABLE car_listings (
  -- identity
  car_id            integer PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  -- which lot won the per-car collapse (for the detail link / debugging)
  lot_id            integer NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,

  -- ===== FILTER columns (all indexable, single-table) =====
  manufacturer_id   bigint,        -- cars.manufacturer_id (brand facet)
  model_id          bigint,        -- cars.model_id (model facet)
  car_year          integer,       -- cars.year
  car_color         text,          -- cars.color (clean enum)
  drive_wheel       text,          -- cars.drive_wheel (front/all/rear)
  buy_now           boolean,       -- chosen lot's buy_now
  domain_name       text,          -- chosen lot's source SITE → badge (copart/iaai/encar)
  location_country  text,          -- chosen lot's country → MARKET tab (USA/Canada/kr/rb)
  lot_number        text,          -- chosen lot's lot number (search)
  vin               text,          -- cars.vin (search)
  effective_price   numeric(14,4), -- COALESCE(NULLIF(buy_now_price,0),
                                   --          NULLIF(final_bid,0), NULLIF(bid_price,0))
  -- ===== SORT key =====
  sort_id           integer NOT NULL,  -- = chosen lot_id; monotonic, unique → keyset cursor

  -- ===== DISPLAY columns (denormalized so the card needs no join) =====
  title             text,          -- cars.title
  -- NB: brand/model NAMES are intentionally NOT stored here — they come from
  -- manufacturers/vehicle_models, which the DAILY reference sync can change without
  -- touching a lot (so the per-lot recompute hook wouldn't refresh them). Resolve
  -- names by id at read time (cheap ref-table join / cached lookup). See §7 caveat.
  image_url         text,          -- chosen lot's image
  odometer_km       bigint,        -- chosen lot
  sale_date         timestamptz,   -- chosen lot
  status            text,          -- chosen lot (sale/upcoming/future/sold…) → card state
                                   --   (countdown vs "Предстои" / "приключи" / "Наличен")
  condition         text,          -- chosen lot (raw key; BG label applied in app)
  damage_main       text,
  seller            text,
  transmission      text,          -- cars.transmission
  -- raw price parts kept for the card's exact "Buy Now vs Цена" rendering
  buy_now_price     numeric(14,4),
  bid_price         numeric(14,4),
  final_bid         numeric(14,4),

  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

Notes:
- **`car_id` PK** guarantees one card per physical car — the dedupe is structural, not a
  query-time `DISTINCT`.
- **`sort_id` = the chosen lot's id.** It's unique and monotonic-ish (serial), so it's a
  clean keyset cursor and gives "newest listing first" ordering (matches legacy
  `ORDER BY id DESC` intent). Storing it as its own column (vs reusing `lot_id`) lets the
  pick-strategy and the sort key evolve independently if needed.
- **`brand_name`/`model_name` resolved at write time** from the reference tables → the
  card shows real names with zero runtime joins, and brand/model facets can read
  `DISTINCT manufacturer_id` + a tiny ref lookup, or be served straight from
  `manufacturers`/`vehicle_models`.
- **`effective_price`** collapses the legacy 3-column precedence (buy_now → final_bid →
  bid, zeros nulled). Raw parts retained for exact card rendering.
- Display-only fields not used for filtering (title, damage, seller, transmission, …) are
  copied too — the whole point is a self-contained read row.

**Storage cost — measured, not hand-waved.** The new table is **~0.5 GB total**, ~+4% on
the DB. Don't be misled by `auction_lots` showing 5.9 GB: **88.5% of that (5.24 GB) is
TOAST — the `raw_json` payload** — which `car_listings` does NOT copy. The real comparison:
| | row count | per-row data | est. heap | + indexes | total |
| --- | --- | --- | --- | --- | --- |
| `car_listings` | **935k** (deduped cars) | ~190 B (measured col widths) | ~215 MB | ~250–300 MB | **~0.5 GB** |
| (vs `auction_lots` real heap) | 1.18M | — | 555 MB | 127 MB | 0.68 GB (excl. 5.2 GB raw_json) |
This is also ≈ what column-denormalization onto `auction_lots` would add (~6 cols ×
**1.18M** lot rows + indexes) — i.e. **storage is a wash between the two approaches**
(~+4% either way). The projection table wins on *correctness* (one-card-per-car without a
timing-out query-time dedupe), not storage; it is **not** "twice the storage" (that earlier
framing wrongly compared the table total against the TOAST-inflated source total).

### Pick-strategy: which lot represents a multi-lot car

Measured: multi-active-lot cars **do differ** (different sale dates, sometimes
copart+iaai). The card's job is "show a car the user can still act on," so the winner is
chosen **actionable-first** (not just newest — a newest-ingested lot can be a dead/ended
auction). Applied at write time, deterministic:

> **Chosen lot = the active, image-bearing lot for that car, ordered by:**
> 1. **actionable first** — `status IN ('sale','upcoming','future','on_approval','new_auction')`
>    OR a valid buy-now (`buy_now=true AND buy_now_price>0`) ranks above ended/sold;
> 2. **soonest upcoming** — `sale_date ASC NULLS LAST`;
> 3. **newest** — `id DESC` (tiebreak; id unique → fully deterministic).

```sql
ORDER BY
  (status IN ('sale','upcoming','future','on_approval','new_auction')
   OR (buy_now = true AND buy_now_price > 0)) DESC,   -- actionable first
  sale_date ASC NULLS LAST,                            -- soonest auction
  id DESC                                              -- newest tiebreak
LIMIT 1
```

Why this and not "greatest id": measured, **99.8%** of active lots are in an actionable
status (`sale`/`upcoming`/`future`), and **99.3% of the 61,538 multi-active-lot cars have
at least one actionable lot** — so this rule almost always finds a still-gettable listing,
and only falls back to newest for the rare all-dead car. Walking the actual user
("browse cars I can still import & inquire about") is what rules out plain newest-id —
newest-ingested ≠ still-gettable. It's a single `ORDER BY`, cheap to retune later.

> **Tabs largely neutralize this anyway:** because a car is effectively buy-now-only OR
> auction-only (only **45** cars are both — see §2/plan §6a), once the channel tab is
> applied each car has one relevant lot. The pick-strategy then only disambiguates
> **auction-relisted** cars (same car, several upcoming/ended auctions) — exactly what the
> ordering above handles.

Mirror in `packages/db/schema.ts` as a new `pgTable("car_listings", …)` + inferred types.

---

## 5. Filters → SQL (all single-table, zero joins)

Every filter and the sort are now columns on `car_listings`:

| Filter | Predicate |
| --- | --- |
| base | (none needed — the table only contains active+img cars by construction) |
| brand | `eq(manufacturer_id, $brandExternalId)` |
| model | `eq(model_id, $modelExternalId)` |
| color | `eq(car_color, $value)` |
| drive | `eq(drive_wheel, $value)` |
| year | `eq(car_year, $value)` |
| price min/max | range on `effective_price` |
| buy-now only | `eq(buy_now, true)` |
| market | us→`location_country='USA'`; kr→`='kr'`; ca→`='Canada'` (NOT `domain_name` — that's the auction site, not the country) |
| search | `or(lot_number LIKE 'q%', vin = 'q')` — **WITHOUT `ORDER BY sort_id`** (see note) |
| keyset | `lt(sort_id, $cursor)`; `orderBy(desc(sort_id))`; `limit(PAGE+1)` |

> **⚠️ VERIFIED query-shape finding (Step 6 EXPLAIN):** lot/VIN **search is a LOOKUP, not a
> sorted feed**. Adding `ORDER BY sort_id DESC` to a `lot_number LIKE` query made the planner
> walk `cl_sort` and filter in-scan → **37,888 buffers** (slow). Dropping the sort lets it use
> `cl_lotnumber` (`text_pattern_ops`) → **26 buffers**; `vin =` uses `cl_vin` → 4 buffers. So
> in `getCarsPage` (Step 9): when `filters.search` is present, run an **exact lookup branch**
> (no keyset, no sort_id ordering, small LIMIT) instead of the paged-feed branch. Search
> results don't need infinite scroll — they're "find this specific car".

> **VERIFIED index behavior (Step 6):** the planner uses `cl_sort` (plain `sort_id DESC`) +
> in-scan filter for COMMON filters (e.g. Honda ~10% of rows: page 1 = 10 buffers, page 40 =
> 122 buffers — flat at depth), and switches to the targeted composite (`cl_brand_sort`) for
> RARE filters (57-car brand: 27 buffers via the composite). Both fast; composites are NOT
> dead weight. Filtered `COUNT` over a broad filter is the one slow query (~24k buffers Bitmap
> Heap Scan) → cache it (`cacheLife("hours")`) and/or "1000+" via `LIMIT 1001` existence check
> (rare-filter count is already ~50ms).

Listing query is just:
```sql
SELECT * FROM car_listings
WHERE manufacturer_id = $brand AND car_color = $color   -- example
  AND ($cursor IS NULL OR sort_id < $cursor)
ORDER BY sort_id DESC
LIMIT 25;                                                -- PAGE+1
```
No join, no dedupe, no cross-table scan. `COUNT(*)` is single-table over a 935k-row table
(cache it; "1000+" above a threshold still optional).

---

## 6. Indexes on `car_listings`

Composite btrees leading with the filter, ending in the sort key, so Postgres walks in
output order and stops at LIMIT. No partial predicate needed (table is already the active
set).

```sql
CREATE INDEX cl_sort                ON car_listings (sort_id DESC);                 -- unfiltered
CREATE INDEX cl_brand_sort          ON car_listings (manufacturer_id, sort_id DESC);
CREATE INDEX cl_brand_model_sort    ON car_listings (manufacturer_id, model_id, sort_id DESC);
CREATE INDEX cl_buynow_sort         ON car_listings (buy_now, sort_id DESC);
CREATE INDEX cl_year_sort           ON car_listings (car_year, sort_id DESC);
CREATE INDEX cl_color_sort          ON car_listings (car_color, sort_id DESC);
CREATE INDEX cl_country_sort        ON car_listings (location_country, sort_id DESC); -- market tab
CREATE INDEX cl_price_sort          ON car_listings (effective_price, sort_id DESC)
                                       WHERE effective_price > 0;                   -- 31% have price
CREATE INDEX cl_lotnumber           ON car_listings (lot_number text_pattern_ops);  -- prefix search
CREATE INDEX cl_vin                 ON car_listings (vin);
```
- Multi-filter combos: planner uses one composite for leading equality cols + filters the
  rest in-scan, or BitmapAnds single-col indexes. Don't pre-build every combination; add a
  specific composite only if `EXPLAIN` on a real slow combo shows a seq scan.
- **drive_wheel** (3 values, 26% null) and **transmission** (2 values) are low-selectivity
  → no dedicated index; filter in-scan. (`drive` is a filter but cheap to filter post-scan;
  `transmission` isn't a filter at all.)
- 10 indexes on a ~935k-row table is light; reads dominate.

---

## 7. Keeping `car_listings` in sync — integrated with the ACTUAL ingestion

This is the real cost of the table. Here's how it plugs into the **existing** pipeline
(read from source, not assumed):

**Ingestion architecture (as built):** AWS **Lambda + Step Functions**, code in
`packages/functions/`. Pages of `/api/cars` and `/api/archived-lots` are fetched and
written **in the same invocation**. **All writes go through exactly two functions in
`packages/functions/shared/db.ts`:**
- `upsertCarsAndLots(rawCars)` — active sync (`syncCarsPage` handler) + detail refresh
  (`upsertDetail` → same fn). Loops per car: upserts `cars` (`ON CONFLICT (external_car_id)`),
  then each lot (`ON CONFLICT (domain_id, lot_number)`).
- `archiveLots(rawLots)` — archive sweep (`syncArchivedLotsPage`). Sets `archived=TRUE` +
  `archived_at` on matching lots (`ON CONFLICT (domain_id, lot_number) DO UPDATE`).

Both use raw `pg` against the **Neon pooled endpoint** (PgBouncer transaction pooling,
`max: 2` connections, **no named prepared statements**), loop row-by-row inside one
acquired `client`, and are **idempotent**. That's a clean two-point integration surface.

**Orchestration (read from `infra/src/*` — EventBridge Scheduler + Step Functions):**

| Flow | Schedule | State machine → Lambda | Writes via | Recompute hook |
| --- | --- | --- | --- | --- |
| Active cars (incremental) | **`rate(1 hour)`** | `combinedHourlySync` → `hourlyCarsSync` → `syncCarsPage` (`minutes=75`) | `upsertCarsAndLots` | ✅ per page |
| Archived lots | **`rate(1 hour)`** (runs right after cars, same machine) | `combinedHourlySync` → `archivedLotsSync` → `syncArchivedLotsPage` | `archiveLots` | ✅ per page |
| Full inventory backfill | **manual only** | `fullInventoryBackfill` → `syncCarsPage` (`mode=full`) | `upsertCarsAndLots` | ✅ per page (free) |
| Detail refresh | **user-triggered** → SQS FIFO (single-concurrency drain, content-dedup, ~1 req/s) | `refreshListingDetail` → `refreshOneListing` | `upsertDetail` → `upsertCarsAndLots` | ✅ per call (free via the same hook) |
| Reference data | **`rate(1 day)`** | `referenceSync` → `referenceInit`/`referenceManufacturer` | `upsert{Manufacturer,Model,Generation}` | ⚠️ see caveat |

**All 5 write paths funnel through the 2 `db.ts` functions** (verified `refreshOneListing
→ upsertDetail → upsertCarsAndLots`), so the recompute hook covers flows 1/2/3/5
automatically; only flow 4 (reference names) needs the separate handling above. Nothing
mutates `cars`/`auction_lots` outside these two functions.

> **Detail-refresh queue is reusable for the future car detail route.** The infra exports
> `detailRefreshQueueUrl` precisely so "the app backend enqueues refresh requests" (FIFO,
> `MessageGroupId`, content-dedup, rate-safe). When the deferred `/avtomobil/[id]` detail
> page is built (plan §7), it enqueues here to refresh that listing on demand — the
> mechanism already exists; no new rate-limit plumbing needed.

Every paginated machine loops `InitSyncRun → SyncPage → HasNextPage? → Wait 1s →
IncrementPage → SyncPage…`. Key consequences for us:
- **There is NO "end of run" Lambda** that sees all touched car_ids — each page is its own
  invocation. So recompute **must be per-page, inside `db.ts`** (where the car_ids for that
  page are known). A "recompute everything at the end" step has nowhere to live. ✔ matches
  the design below.
- **`SyncPage` retries the whole page** (`States.ALL`, ≤4×). Recompute is appended inside
  the same idempotent upsert and is itself idempotent → a retry just recomputes the same
  car_ids; safe.
- Hourly cars + archived run **sequentially in one machine** (to protect 1 req/sec), so
  recompute load is naturally serialized too — no concurrent recompute storms.

**⚠️ Reference-sync caveat (the daily flow).** `car_listings` denormalizes `brand_name` /
`model_name` from `manufacturers` / `vehicle_models`. The **daily** reference sync can
change those names **without touching any lot** — so the per-lot recompute hook would NOT
fire, and copied names would go stale. Options:
- **(chosen) Don't denormalize the names.** Keep only `manufacturer_id` / `model_id` on
  `car_listings`; resolve display names via a cheap join to the 424/3400-row ref tables, or
  a cached app-side `id→name` lookup (`getCarFacets` already loads these). Removes the
  staleness entirely and drops 2 columns. The names were the *only* `car_listings` field
  sourced from a table the per-lot hook doesn't cover, so this fully closes the gap.
- (fallback) Keep the names but let the **nightly drift sweep** (§ below) repair them — fine
  since brand/model names virtually never change. Or recompute affected cars after the daily
  reference run. Use only if a join per render is undesirable.

→ **Schema change vs the §4 table:** drop `brand_name` / `model_name` from `car_listings`;
the mapper/query joins `manufacturers`/`vehicle_models` by id (or uses the cached facet
lookup) for labels. Everything else in §4 stands.

**Sizing (measured):** a full 1000-lot page touches **~992 distinct car_ids** (worst case;
hourly incremental pages are far smaller). So per-page recompute = **one** set-based
statement over ~1000 ids (`WHERE car_id = ANY($1::int[])`) → a single round-trip, trivially
within the 300s Lambda timeout and the `max:2` pool. Per-page is right; per-row would be
~1000× the round-trips.

**Data-integrity facts that make this safe (all probed live, not assumed):**
- **`car_id` is NON-NULL on 100%** of active+image lots → every listing becomes a card; the
  `car_id`-keyed table never silently drops rows.
- **`buy_now=true` ⇒ `buy_now_price>0` on 100%** → no "BUY NOW badge with no price" card;
  the badge + channel predicate are safe.
- **`status` has a small tail** beyond the actionable set: `sold` (~1.8k), `not_checked`
  (~350), `not_on_sale` (7), and **`status = NULL` (4)**. Pick-strategy ranks all of these
  last (correct). The card's status pill + `STATUS_BG` map MUST handle `NULL`/unknown →
  fall back to "Неизвестен" (don't render a blank pill).

**Constraints these impose on `recompute` (important):**
- Plain parameterized SQL only (no `PREPARE`/named statements — PgBouncer txn mode).
- Tiny pool + 1 req/sec pacing → **do NOT call recompute per-row** (1000 extra round-trips
  per page would dominate). Instead **collect the touched `car_id`s per page and run ONE
  set-based recompute** after the existing loop, reusing the same `client`.

**The recompute primitive.** A car's row is a pure function of its `cars` row + its current
active+img lots (collapsed by pick-strategy §4) + resolved brand/model names. One
idempotent **set-based** statement handles upsert *and* delete for a batch of car_ids:

```sql
-- recompute_car_listings(car_ids int[]) — upserts cars that still have a usable lot,
-- deletes those that no longer do. Plain SQL (PgBouncer-safe), reuses the ingestion client.
WITH ids AS (SELECT unnest($1::int[]) AS car_id),
chosen AS (                                  -- pick-strategy §4: actionable-first
  SELECT DISTINCT ON (al.car_id)
         al.car_id, al.id AS lot_id, al.* 
  FROM auction_lots al
  JOIN ids ON ids.car_id = al.car_id
  WHERE al.archived = false AND al.image_url IS NOT NULL
  ORDER BY al.car_id,
    (al.status IN ('sale','upcoming','future','on_approval','new_auction')
     OR (al.buy_now = true AND al.buy_now_price > 0)) DESC,
    al.sale_date ASC NULLS LAST,
    al.id DESC
),
upsert AS (
  INSERT INTO car_listings (car_id, lot_id, sort_id, manufacturer_id, model_id, car_year,
      car_color, drive_wheel, buy_now, domain_name, location_country, lot_number, vin,
      effective_price, title, image_url, odometer_km, sale_date,
      status, condition, damage_main, seller, transmission, buy_now_price, bid_price, final_bid)
  SELECT ch.car_id, ch.lot_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year,
      c.color, c.drive_wheel, ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number,
      c.vin, COALESCE(NULLIF(ch.buy_now_price,0), NULLIF(ch.final_bid,0), NULLIF(ch.bid_price,0)),
      c.title, ch.image_url, ch.odometer_km, ch.sale_date,
      ch.status, ch.condition, ch.damage_main, ch.seller, c.transmission,
      ch.buy_now_price, ch.bid_price, ch.final_bid
  FROM chosen ch
  JOIN cars c ON c.id = ch.car_id          -- only `cars` needed now (names resolved at read time)
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id=EXCLUDED.lot_id, sort_id=EXCLUDED.sort_id, manufacturer_id=EXCLUDED.manufacturer_id,
    /* …all columns… */ updated_at = now()
)
DELETE FROM car_listings cl                  -- cars in the batch with NO usable lot anymore
USING ids
WHERE cl.car_id = ids.car_id
  AND NOT EXISTS (SELECT 1 FROM chosen ch WHERE ch.car_id = ids.car_id);
```
(Final form: split into an upsert CTE/stmt + a delete stmt if a single CTE gets unwieldy;
behavior is what matters.)

**The two integration edits (both in `shared/db.ts`):**
1. **`upsertCarsAndLots`** — collect `carId` of every car whose lots were written into a
   `Set<number>` during the existing loop; **after** the loop (still inside the `try`,
   same `client`), call `recompute_car_listings([...ids])`.
2. **`archiveLots`** — the subtle one. Archiving a lot can remove/swap a car's chosen lot
   → its row must be recomputed (promote next-best, or **delete** if no usable lot remains).
   The archived-lots payload carries the *external* car id; resolve the **local** car_id —
   easiest: add `RETURNING car_id` to that upsert and collect the non-null ones, then
   recompute the set. **This path must not be skipped** or archived cars linger in the grid.

Both are **purely additive** — they append a step after work the functions already do; if
the recompute statement errored it would not corrupt `cars`/`auction_lots` (separate
statement, and Step Functions already retries the whole idempotent page).

> **✅ RESOLVED — but the fix is to PERSIST the API's `archived` flag, not "do nothing"
> (corrected after reading the real API reference + live probe).** Findings:
> - The **lot object carries an explicit `archived` boolean + `archived_at`** in BOTH the
>   `/cars`/`search-lot` shape and `/archived-lots`. The official doc sample for
>   `/cars,/search-vin,/search-lot` shows a lot with `"archived": true, "status":"sold"`.
> - The **paginated `/cars` listing returns active lots in practice** (live probe of 200
>   lots: all `archived=false`, statuses sale/upcoming/future). But **`/search-lot`/
>   `/search-vin` (→ our detail-refresh → `upsertDetail` → `upsertCarsAndLots`) WILL return
>   an archived lot** when you look one up directly.
> - **The real bug:** `upsertCarsAndLots` currently **ignores `raw.archived`** — so an
>   archived lot arriving via detail-refresh would be written with the column defaulting to
>   `archived=false`, wrongly resurrecting it in `car_listings`.
> **Fix (additive, belongs with our work): persist the flag the API already gives us.** Add
> `archived`/`archived_at` to the `normalizeLot` output + the `upsertCarsAndLots` upsert
> (`archived = COALESCE(EXCLUDED.archived, auction_lots.archived)`), so `archived` is correct
> by construction from every feed. Then `car_listings`'s `archived=false` filter is
> trustworthy, and recompute naturally drops a lot that comes back marked archived.
> **No "resurrection" guessing, no terminal-archive assumption** — just store the source of
> truth. (A relisted car still also appears as a NEW lot_number via `/cars`; that path is
> unaffected and recompute promotes it.)

**Safety net (optional, recommended):** also create the recompute as a DB function +
`AFTER INSERT/UPDATE/DELETE` trigger on `auction_lots` — a can't-forget guarantee if a
future write path forgets to call it. Heavier per-write, so keep app-side batching as the
primary path and treat the trigger as belt-and-suspenders (or skip and rely on the nightly
sweep below).

**Backfill (one-time):** populate from scratch, batched by car_id range to avoid a long
txn / lock. Same pick-strategy as recompute (§4):
```sql
INSERT INTO car_listings (…)
SELECT … FROM cars c
JOIN LATERAL (
  SELECT * FROM auction_lots al
  WHERE al.car_id=c.id AND al.archived=false AND al.image_url IS NOT NULL
  ORDER BY
    (al.status IN ('sale','upcoming','future','on_approval','new_auction')
     OR (al.buy_now=true AND al.buy_now_price>0)) DESC,
    al.sale_date ASC NULLS LAST, al.id DESC
  LIMIT 1
) lot ON true
WHERE c.id BETWEEN $lo AND $hi            -- only `cars` + the chosen lot; names resolved at read
ON CONFLICT (car_id) DO UPDATE SET …;     -- loop ranges; then CREATE INDEX; ANALYZE
```
Run this as a standalone script (e.g. `packages/db/backfill-car-listings.mjs`, same
`pg.Client` + env pattern as `migrate.mjs`) looping id ranges of ~25–50k — NOT inside a
single migration (keeps the migration fast + the long write interruptible/resumable).

**Drift guard:** nightly job recomputes cars whose lots changed in the last N hours (or a
full sweep — the backfill query *is* the sweep). Given ingestion cadence, nightly is
ample insurance.

---

## 8. Why a real table, not a Postgres `MATERIALIZED VIEW`

A `MATERIALIZED VIEW` would need `REFRESH MATERIALIZED VIEW [CONCURRENTLY]` — a **full
recompute of all 935k rows** every cycle (the timeout-prone collapse, run wholesale), and
`CONCURRENTLY` needs a unique index + still rebuilds everything. The hand-maintained table
updates **only the cars that changed** per sync, incrementally. So: a real table +
incremental recompute is cheaper, fresher, and avoids the very GROUP BY that already times
out. (Standard "matview as a table" reasoning.)

---

## 9. Rollout order (DB side) — and how it stays PROD-SAFE

The DB is **production**. The good news: this change is **purely additive** — a brand-new
table + a new index set + an appended step in two ingestion functions. It does **not**
alter, migrate, or drop any existing column/row in `cars`/`auction_lots`. Existing reads
(homepage queries) and the running sync are unaffected until we choose to read the new
table. Migrations here are **hand-run** (`pnpm migrate` → `migrate.mjs`, append-only,
tracked in `_migrations`, every statement `IF NOT EXISTS`) — there is **no auto-apply on
deploy**, so nothing touches prod until someone runs it deliberately.

Order (each step independently safe; stop/verify between):
1. **Migration `0006_car_listings.sql`** — `CREATE TABLE IF NOT EXISTS car_listings (…)`
   only (no indexes yet — add them post-backfill so the load isn't index-maintained row by
   row). Mirror as a `pgTable` in `packages/db/schema.ts`. Apply with `pnpm migrate`
   (use the **direct/non-pooled** Neon URL for DDL, per `migrate.mjs` header note). Empty
   table → zero risk to anything.
2. **Backfill script** (`packages/db/backfill-car-listings.mjs`, §7) — loop car_id ranges
   ~25–50k. Read-heavy on `cars`/`auction_lots` but **write-isolated** to the new table;
   throttle/`SELECT pg_sleep` between batches if you want to spare the sync. Resumable
   (re-run is an idempotent upsert). Verify count ≈ **935k**, no dup `car_id`.
3. **Create the §6 indexes** (`CREATE INDEX` — consider `CONCURRENTLY`, run outside a txn,
   so it never locks the table against the backfill/ingestion); then `ANALYZE car_listings`.
4. **Wire recompute into `shared/db.ts`** (§7) — additive step in `upsertCarsAndLots` +
   `archiveLots`. Ship via the normal Lambda deploy. Until this lands, the table simply
   goes stale (harmless — nothing reads it yet). After it lands, watch one sync cycle in
   CloudWatch. (Optional: trigger safety net.)
5. **Validate**: `EXPLAIN ANALYZE` brand filter at page 1 and page 40 → both index scans in
   sort order, low buffers, flat vs depth; filtered `COUNT` single-table (no `cars`
   seq-scan); per-car uniqueness holds.
6. **Only then** build + ship the `ALL-CARS-PLAN.md` page reading `car_listings`. The page
   is the *last* thing, so all the DB work is verifiable in isolation before any user sees
   it.

**Reversibility:** if anything looks wrong, `DROP TABLE car_listings` + revert the two
`db.ts` edits — `cars`/`auction_lots` and every existing surface are untouched. No data
migration to unwind.

**Acceptance bar:** listing + count for any single filter respond in tens of ms and don't
degrade with page depth; `car_listings` row count tracks distinct active cars; relisted
cars appear once; one full sync + archive cycle keeps the table consistent (spot-check a
handful of recently-archived lots disappeared and re-listed ones swapped).

---

## 10. Open items

- **Pick-strategy** = **LOCKED: actionable-first** (actionable status / valid buy-now →
  soonest `sale_date` → newest `id`), per §4. One `ORDER BY` in recompute + backfill if it
  ever needs retuning.
- **Market** = `location_country` (USA / Canada / kr), NOT `domain_name`. All four UI
  tabs (Всички/Корея/САЩ/Канада) are real: USA 745k · kr 233k · Canada 12k · + a tiny
  `rb` 2.8k bucket that folds into "Всички". Per-car country span = 4 of 931k → lossless.
- **Brand/model facets**: serve from `manufacturers`/`vehicle_models` (cached) or
  `DISTINCT manufacturer_id` off `car_listings`; models lazy per selected brand.
- **Count cost** on broad filters: cache (`cacheLife("hours")`); "1000+" threshold
  optional.
- **Detail route** still deferred (`ALL-CARS-PLAN.md` §7); `lot_id`/`car_id` on the row
  make the future link trivial.
