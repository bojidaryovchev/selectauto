# `/всички-автомобили` — All-Cars page (infinite + virtualized, full filters)

Implementation plan for porting the legacy WordPress `[mixed_cars_grid]` page
(`assets/plugins/selectauto_mixed_cars/selectauto_mixed_section.php`, served at
`/всички-автомобили/`) into `apps/web` (Next 16.2.9, Cache Components on).

Decisions locked with the user:
- **Full filter parity** with the legacy page.
- **Server Action** (`"use server"`) as the load-more mechanism (not a route handler).
- **Infinite scroll + virtualization** (windowed rendering, not just append).
- **One card = one physical car** (relisted cars deduped via the `car_listings` projection).
- **Conversion = per-card phone/Viber buttons** (reproduce the legacy card overlay; uses
  `CONTACT`/Viber from `constants`). No inquiry-modal wiring on cards in this build.
- **Pick-strategy = actionable-first**; **engine/specs shown verbatim**; **i18n in the app**.

## Scope of THIS deliverable (definition of done)

**IN:** a production-ready catalog at `/всички-автомобили` — `car_listings` foundation +
ingestion sync, the virtualized infinite grid, ALL filters + market/buy-now tabs (per the
mockup), the rich BG-localized card with phone/Viber, SSR first page + SEO metadata.
Green type-check/lint/`next build`; verified against prod data.

**OUT (explicit follow-ups, not this build):**
- **Car detail page** `/avtomobil/[id]` — "Подробности" links to a section page for now.
  (Its on-demand refresh via the existing detail-refresh **SQS queue** is already available
  when that project starts — see `ALL-CARS-DB-DESIGN.md` §7.)
- Inquiry-modal-per-card, pretty `/marka/{slug}` brand URLs, multi-image galleries
  (single image only — not in Neon).

---

## 0. Ground truth from the live Neon DB (probed, not assumed)

| Fact | Value | Consequence for the plan |
| --- | --- | --- |
| Active lots w/ image | **998,289** (`cars` 1.1M, `lots` 1.18M) | This is **~1M rows, not "hundreds"**. Virtualization is justified; **OFFSET pagination is unusable at depth** → must use **keyset/cursor** pagination. |
| `buy_now` split (active+img) | false 705k · true 275k · null 18k | Auction = `buy_now IS NOT TRUE`; buy-now = `buy_now = true`. Same predicate the homepage queries already use. |
| `cars.color` | clean enum-ish: `white/black/grey/silver/blue/red/...` | Facet directly with `SELECT DISTINCT` — **no WP-style normalization needed** (ingestion already cleaned it). Only needs BG label translation. |
| `cars.drive_wheel` | exactly 3: `front / all / rear` | Trivial facet → BG: Предно / 4x4 / Задно. |
| `cars.year` | ints 1990s–2025 | Facet = `SELECT DISTINCT year ... ORDER BY year DESC`. |
| `auction_lots.domain_name` | `copart_com / iaai_com / encar_com` | Auction **site** → the **source badge** (COPART/IAAI/ENCAR). NOT the market filter. |
| `auction_lots.location_country` | `USA 745k / kr 233k / Canada 12k / rb 2.8k` | The **market** tabs (САЩ / Корея / Канада). Distinct from `domain_name` — IAAI/Copart both list US *and* Canadian cars. |
| Brand / model | `cars.manufacturer_id` / `model_id` (external ids) → `manufacturers` (424) / `vehicle_models` (3400) | Brand/model facets come from the **reference tables** (clean), joined by `*_external_id`. There is **no `make`/`model` text column** on `cars`. |
| `buy_now_price` on auctions | `'0.0000'` (string, not null) | Existing `formatPrice()` `<= 0` guard already hides these. Reuse the mapper. |

**Why this matters:** the 3000-line WP plugin's bulk (`samix_normalize_brand_label`,
`samix_base_model`, `samix_map_drive_bg`, the runtime-index chunk builder) exists to
fight *WordPress postmeta dirt* — Korean strings, "MERCEDES BENZ" vs "MERCEDES-BENZ",
"4WD"/"AWD"/"4x4". **That dirt does not exist in Neon** (the ingestion `normalize.ts`
already canonicalized it). So we port the *page*, not the *normalizer*. The facet
index becomes a handful of cached `DISTINCT` queries instead of a 1M-row option scan.

---

## 1. The legacy page, decoded

Route `/всички-автомобили/` is a WP Page rendering the `[mixed_cars_grid]` shortcode.
What it does (from `selectauto_mixed_section.php`):

- **Filters** (GET params, server-rendered `<form>`, page reload per change):
  `saa_brand`, `saa_model` (depends on brand), `saa_color`, `saa_drive`, `saa_year`,
  `saa_price_min`, `saa_price_max`, `saa_buy_now` (checkbox), `saa_market`
  (kr/us/ca), `saa_lot_vin` (lot-number OR VIN `LIKE`). Also a route form
  `/marka/{slug}` for brand landing pages.
- **List**: `SELECT * FROM wp_sa_cars WHERE <filters> ORDER BY id DESC LIMIT 12 OFFSET …`
  + `paginate_links()`. Count via `SELECT COUNT(*)`. **Offset pagination** — what we're replacing.
- **Card** (`.selectauto-auction-card`, richer than the homepage `sa-car-card`):
  image + lazy/onerror; **source badge** + **BUY NOW** badge (top-left); phone/Viber
  buttons (top-right, hover); a **status/countdown bar** (live JS countdown to
  `auction_ts`, or "Предстои" / "Аукционът приключи" / "Наличен"); title; a 2-col
  **info grid** (Търг №, Дата, Пробег, Състояние, Щета, Двигател, Задвижване,
  Скоростна кутия, Продавач, Тип продавач — each rendered only if present); a price
  row ("Buy Now"/"Цена"); a "Подробности" button. Full CSS is inline in the plugin
  (lines ~2100–2755) — translate to Tailwind, matching the orange `sa-*` design system
  already in `globals.css`.
- **Card link**: auctions → `/auction-car/{car_id}/`; encar sale → the WP permalink.
  **We have no detail route yet** → see §7 (link to section pages for now, like the
  homepage mapper does).
- **Caching**: per-filter-combo HTML transient (`samix_grid_html_…`) + a filter-options
  transient. We replace both with `"use cache"` + `cacheTag`.

### Field availability + provenance + i18n (verified against live data)

Every card field, where the value comes from, and how it's shown to a **Bulgarian** user.
"i18n class" is the crux — see §1a. (`L` = label only, value translated; `P` = passthrough,
value shown as-is; `F` = formatted.)

| Card field (BG label) | Neon source (→ `car_listings` col) | Distinct values | i18n class | Shown to BG user |
| --- | --- | --- | --- | --- |
| (title) | `cars.title` → `title` | free text | **P** | "2020 Chevrolet Equinox LS" as-is (proper noun) |
| source badge | `auction_lots.domain_name` → `domain_name` | 3 | label | COPART / IAAI / **ENCAR** (brand names, keep latin) |
| BUY NOW badge | `buy_now`+`buy_now_price` → `buy_now`,`effective_price` | bool | label | "BUY NOW" (kept latin, as legacy) |
| Цена / Buy Now | `buy_now_price`/`final_bid`/`bid_price` → `effective_price` (+raw parts) | numeric | **F** | "11 395 €" (space-grouped, existing `formatPrice`) |
| Статус | `auction_lots.status` → `status` | **7** | **enum** | `sale`→Наличен, `upcoming`/`future`→Предстои, `sold`→Продаден… |
| Пробег | `odometer_km` → `odometer_km` | numeric | **F** | "186 795 km" (existing `formatMileage`) |
| Дата / countdown | `sale_date` → `sale_date` | ts | **F** | "30.06.2026" + live countdown (client) |
| Търг № | `lot_number` → `lot_number` | id | **P** | "58927116" as-is |
| Състояние | `condition` → `condition` | **4** | **enum** | `run_and_drives`→Пали и се движи, `not_run`→Не пали, `enhanced`→Подобрено, `engine_starts`→Пали |
| Щета | `damage_main` → `damage_main` | **2,393** (free text) | **enum+P** | top ~40 mapped (Front End→Предна част…), long tail passthrough |
| Двигател | `cars.engine` → `engine` | **6,823** (spec strings) | **P** | "1.5l 4" / "2.0l i-4 dohc…" as-is (see §1a) |
| Задвижване | `cars.drive_wheel` → `drive_wheel` | **3** | **enum** | `front`→Предно, `all`→4x4, `rear`→Задно; null→Неизвестно |
| Скоростна кутия | `cars.transmission` → `transmission` | **2** | **enum** | `automatic`→Автоматична, `manual`→Ръчна |
| Продавач | `auction_lots.seller` → `seller` | free text | **P** | "Progressive" as-is (company name) |
| phone/Viber buttons | static `CONTACT` + Viber (constants) | — | — | ✅ per-card overlay (conversion path; reproduce legacy) |
| Тип продавач | `lot.seller_type` (API enum insurance/non) — **NOT yet stored in Neon** | 2 | enum | ⚠️ recoverable: API HAS it (`SellerTypeEnum`); needs `seller_type` added to normalize+schema. Deferred to follow-up — drop row for v1. |
| gallery | `image_url` (single) → `image_url` | — | — | ⚠️ one photo only (no multi-image in Neon) |

→ **~95% parity.** Only "Тип продавач" + galleries unavailable; everything else maps.

> All listed source fields are **copied onto the `car_listings` projection row** at
> ingestion (`ALL-CARS-DB-DESIGN.md` §4) — the card reads one row, no joins. The mapper
> takes a `car_listings` row. **Translation happens in the app at render (§1a), NOT in the
> DB** — store raw canonical values, localize on display.

### §1a. i18n of card values (the `Front End` / `automatic` leak)

The current screenshot shows **untranslated English values** bleeding through next to
translated labels: `Front End`, `automatic`, `1.5l 4`, `LVL`, `8`, `Front End`. The cause
is that the legacy site only translated *labels* + the `condition` enum, leaving every
other value in source English. We fix this systematically.

**Principle — store raw, translate on render.** Keep canonical source values in
`car_listings` (English/codes). Localize in the **app** at the mapper/component boundary,
via static dictionaries in `src/lib/car-labels.ts` (or `src/data/car-i18n.ts`). Reasons:
(1) the app is BG-only today so there's no runtime locale negotiation needed — a plain
lookup is enough, no i18n framework; (2) keeping raw in the DB means re-labelling (or
adding a language) never requires a backfill; (3) filters/facets must group by the
canonical value regardless of display text. **Never store BG strings in `car_listings`.**

Values split into three classes — design follows the class:

**(A) Closed enums — translate every value (a complete dictionary).** Small, fixed sets;
100% coverage achievable. These get exhaustive maps with a sensible default:

```ts
// car-labels.ts
export const CONDITION_BG: Record<string,string> = {
  run_and_drives: "Пали и се движи", engine_starts: "Пали и се движи",
  not_run: "Не пали", enhanced: "Подобрено",
};
export const STATUS_BG: Record<string,string> = {
  // Full PriceStatusEnum (8 values) — verified complete against the API enum table.
  sale: "Наличен", upcoming: "Предстои", future: "Предстои",
  on_approval: "Очаква одобрение", new_auction: "Нов търг",
  sold: "Продаден", failed: "Неуспешен", not_sold: "Непродаден",
  not_on_sale: "Не се продава", not_checked: "Непроверен",
  // NULL/unknown → "Неизвестен" via the tBG fallback (4 NULL rows exist in Neon).
};
export const DRIVE_BG: Record<string,string> = { front: "Предно", all: "4x4", rear: "Задно" };
export const TRANSMISSION_BG: Record<string,string> = { automatic: "Автоматична", manual: "Ръчна" };
// fuel (cars.fuel_type) likewise if shown: petrol/diesel/electric/hybrid → Бензин/Дизел/Електрически/Хибрид
const tBG = (map, v, fallback="Неизвестно") => (v ? map[v.toLowerCase()] ?? fallback : fallback);
```
All four are tiny (≤7 values) and verified complete against live `DISTINCT` — so coverage
is 100%, no leak. (`condition` is what legacy already did via `$condition_bg_map`; we just
extend the same approach to `status`/`drive`/`transmission`.)

**(B) Large free-text with a fat head — partial dictionary + passthrough.** `damage_main`
has **2,393** distinct values, but the top ~40 cover the overwhelming majority (Front End
334k, Rear End 61k, Side 55k, Normal Wear & Tear 33k, …). Strategy: a curated
`DAMAGE_BG` map for the common ones; **fall back to the raw English** for the long tail
(rare, niche, acceptable). Example seeds:
```ts
export const DAMAGE_BG: Record<string,string> = {
  "front end":"Предна част","rear end":"Задна част","side":"Странична",
  "normal wear & tear":"Нормално износване","hail":"Градушка","rollover":"Преобръщане",
  "left side":"Лява страна","right side":"Дясна страна","front & rear":"Предна и задна",
  "minor dent/scratches":"Леки щети/драскотини","mechanical":"Механична","unknown":"Неизвестна",
  "water/flood":"Вода/наводнение","theft":"Кражба","vandalism":"Вандализъм", /* …~40 */
};
// normalize key: trim+lowercase; unmapped → show raw value (don't blank it).
```
Coverage is "good enough by frequency" — log unmapped values during dev to grow the map.
Decide a cutoff (e.g. map until ≥95% of rows covered).

**(C) Spec strings — passthrough verbatim (DECIDED: show as-is, no cleanup).** `cars.engine`
has **6,823** distinct values that are *specifications*, not words: `1.5l 4`, `2.0l i-4
dohc, vvt, 147hp`, `LVL`, `8`, `D4CB`, `electric`. These aren't translatable text — a
Bulgarian buyer reads "2.0l" the same way. **Render exactly as stored** — no translation,
no formatting, no junk-filtering. `title`, `seller`, `lot_number`, `vin` are likewise
verbatim passthrough (proper nouns / ids). The screenshot's `LVL`/`8` are dirty upstream
canonical data; per decision they show as-is (an ingestion data-quality matter, explicitly
out of scope for the card — the card never hides or guesses an engine value).

**Where it runs:** `car-labels.ts` holds the maps + helpers; the `carListingToView(row)`
mapper applies them so `CarView` already carries BG strings; the `AuctionCard` just
renders. Keep label *captions* (Статус/Пробег/Състояние/Двигател…) as plain JSX text in
the card (they're UI copy, already BG). One place to add a second language later if ever
needed (wrap the maps in a locale dimension), but **not built now** — BG-only.

> Net: enums → fully BG (no leak); damage → mostly BG, raw tail; engine/title/seller →
> as-is by design. This eliminates every avoidable English leak in the screenshot
> (`automatic`→Автоматична, `Front End`→Предна част) while not pretending to translate
> un-translatable spec strings.

---

## 2. Architecture overview

Server-rendered first page (SEO + fast LCP) → client virtualized grid that appends
subsequent pages via a Server Action, keyset-paginated, filters in the URL.

```
src/app/всички-автомобили/
  page.tsx            ← Server Component. Reads searchParams (filters), fetches
                        facet options + first page, renders shell + <AllCarsGrid>.
  loading.tsx         ← skeleton (Suspense fallback for the streamed list)

src/types/
  car.type.ts         ← extend: CarView gains the rich fields (see §3)
  car-filters.type.ts ← CarFilters (parsed search params) + FacetOptions + CarsPage (cursor)

src/lib/
  car-filters.ts      ← parse/serialize CarFilters ⇄ URLSearchParams (shared client+server)
  car-mapper.ts       ← add carListingToView(row, brandModelLookup) — maps a car_listings
                        row → CarView. Brand/model NAMES resolved via a cached id→name
                        lookup (NOT stored on the row — daily ref sync can change them; see
                        DB-design §7). Existing toCarView(lot+car) stays for the homepage.
  car-labels.ts       ← BG label maps (status, condition, drive, transmission, color,
                        damage, fuel) + helpers. Single source of truth for value i18n (§1a).

src/queries/cars/
  get-cars-page.query.ts    ← keyset-paginated page for given filters+cursor ("use cache")
  get-car-facets.query.ts   ← DISTINCT facet options (brands, models-by-brand, colors,
                              drives, years) ("use cache", long cacheLife)
  get-cars-count.query.ts   ← COUNT(*) for "Намерени автомобили: N" ("use cache")

src/mutations/cars/        (or src/queries — it's a read; see §4 note)
  load-more-cars.action.ts  ← "use server" loadMoreCars(filters, cursor) → CarsPage

src/components/cars/all-cars/
  all-cars-grid.tsx         ← "use client". Virtualized infinite grid (orchestrator)
  channel-tabs.tsx          ← "use client". Top-level tabs: Всички / Buy Now / Аукциони
                              + market segmented control (Всички/Корея/САЩ/Канада) +
                              "Само с Buy Now" toggle. Drives channel + market via URL. (§6a)
  car-filter-bar.tsx        ← "use client". Brand/model/color/drive/year/price/search
                              form + mobile drawer trigger (NOT channel/market — those
                              are the tabs above).
  car-filter-drawer.tsx     ← "use client". Mobile bottom-sheet (ports the legacy drawer)
  auction-card.tsx          ← the rich card (server-renderable; presentational)
  auction-countdown.tsx     ← "use client". Live countdown to sale_date
  car-grid-skeleton.tsx     ← shimmer cards for loading.tsx + load-more sentinel
  index.ts                  ← barrel
```

Data flow:
1. `page.tsx` parses `searchParams` → `CarFilters` (incl. `channel` + `market` from the
   tabs). Calls `getCarFacets()` (cached), `getCarsCount(filters)` (cached),
   `getCarsPage(filters, null)` (cached, first page).
2. Renders `<ChannelTabs>` (active channel/market from filters) + `<CarFilterBar>`
   (server-passed facet options + current values) + `<AllCarsGrid initialPage={…}
   filters={filters} total={count} />`.
3. `<AllCarsGrid>` virtualizes the rows. When the sentinel nears the viewport it calls
   the **`loadMoreCars` Server Action** with `(filters, lastCursor)`, appends results,
   advances the cursor, until `nextCursor === null`.
4. Changing a tab **or** a filter updates the URL (`router.push` with new query) → server
   re-renders page 1 for the new filter set (fresh SSR, fresh count). Client grid resets.

---

## 3. Types

```ts
// car.type.ts — extend CarView (keep existing fields; add rich ones, all optional
// so the homepage CarCard and FALLBACK_* arrays keep compiling unchanged).
export type CarView = {
  id: number;                 // NEW — stable key for virtualization & cursor
  title: string;
  href: string;
  price?: string;
  mileage: string;
  engine?: string;
  source: string;             // already present (domain → COPART/IAAI/ENCAR)
  image: string | null;
  badge: { kind: "buy" } | { kind: "time"; label: string };
  // NEW rich fields (auction card). Undefined → row hidden, mirroring the PHP `if`s.
  lotNumber?: string;
  saleDate?: string;          // ISO; countdown component parses it
  condition?: string;         // BG label
  damage?: string;
  drive?: string;             // BG label
  transmission?: string;      // BG label
  seller?: string;
  isAuction: boolean;         // controls countdown vs "Наличен"
  hasBuyNow: boolean;         // controls BUY NOW badge on auctions
};
```

```ts
// car-filters.type.ts
export type CarFilters = {
  // ── channel + market: surfaced as the top-level TABS (§6a), not dropdowns ──
  channel?: "buy-now" | "auction";  // tab; undefined = "Всички". Maps to a buy_now predicate.
  market?: "us" | "kr" | "ca";      // tab sub-row; undefined = both. Maps to location_country
                                    //   us→USA, kr→kr, ca→Canada. (tiny "rb" bucket → "Всички" only.)
  // ── the rest live in the filter bar / drawer ──
  brand?: string;   // manufacturer external id (or slug) — see §5
  model?: string;   // model external id
  color?: string;
  drive?: string;   // front|all|rear
  year?: number;
  priceMin?: number;
  priceMax?: number;
  search?: string;  // lot number or VIN
};
// NB: `channel` replaces the earlier `buyNowOnly` boolean — same predicate, tab-shaped.
// "buy-now" → buy_now=true AND buy_now_price>0; "auction" → NOT that. (See §5 / §6a.)

export type FacetOption = { value: string; label: string; count?: number };
export type FacetOptions = {
  brands: FacetOption[];
  modelsByBrand: Record<string, FacetOption[]>; // keyed by brand value
  colors: FacetOption[];
  drives: FacetOption[];
  years: number[];
};

export type CarsPage = {
  cars: CarView[];
  nextCursor: string | null;  // opaque keyset cursor (encodes last id); null = end
};
```

---

## 4. Pagination: keyset, not offset (the crux)

At ~1M rows, `OFFSET n` scans+discards `n` rows — page 5000 would time out. Use a
**keyset cursor** on the existing primary sort.

> **DB design is its own doc:** `ALL-CARS-DB-DESIGN.md` is the data-layer decision
> record — with live `EXPLAIN ANALYZE` evidence. Key outcome: the page reads a dedicated
> **`car_listings` projection table** (one row per *physical car* with an active lot,
> pre-joined + pre-deduped, maintained by ingestion). This is because (a) a card = one
> car not one lot — relisted cars must collapse, and the per-car `DISTINCT`/GROUP BY
> **times out** on live data; (b) cross-table filter+sort can't share an index. The
> query sketches below read `car_listings` with **zero joins**. **Build that table +
> indexes + ingestion sync (that doc's §9) before wiring these queries.**

- Base order: `car_listings.sort_id DESC` (= the chosen lot's id; unique, monotonic →
  stable keyset cursor, "newest listing first"). NB: `sale_date` is **not** usable as the
  global sort — only **14%** of active lots have one (measured).
- Page query: `SELECT * FROM car_listings WHERE <filters> AND ($cursor IS NULL OR sort_id < $cursor) ORDER BY sort_id DESC LIMIT $PAGE+1`.
  Fetch `PAGE+1` rows; if you got the extra, there's a next page and
  `nextCursor = encode(rows[PAGE-1].sort_id)`; trim to `PAGE`. Else `nextCursor = null`.
- `PAGE_SIZE = 24` (legacy used 12; bump for the grid — tune later).
- Cursor encoding: the numeric `sort_id` as a string (optionally base64). Opaque to client.

`getCarsPage(filters, cursor)` is a **`"use cache"`** function:
```ts
export async function getCarsPage(filters: CarFilters, cursor: string | null): Promise<CarsPage> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);              // invalidated on ingestion writes
  cacheLife("hours");                     // listings move slowly; SWR is fine
  // build Drizzle where() from filters (see §5) over car_listings + keyset, limit PAGE+1
}
```
Cache key includes `filters` + `cursor` (both serializable args) → every
filter/page combo memoizes independently. ✅ This is exactly the `use cache`
arg-as-key model (confirmed in the Next 16 `use-cache` doc).

**The Server Action** just calls the cached query (thin wrapper, so the action and the
first-page SSR share the same cache entries):
```ts
// load-more-cars.action.ts
"use server";
export async function loadMoreCars(filters: CarFilters, cursor: string): Promise<CarsPage> {
  // (optional) re-validate/clamp filters with the zod schema from §5
  return getCarsPage(filters, cursor);
}
```
> Filing note: it lives under `mutations/` by convention only because it's a
> `"use server"` action; semantically it's a read. Acceptable; alternatively keep the
> action next to the query and re-export. Either is fine — pick one and note it in AGENTS.md.

> ⚠️ Cache Components gotcha: `getCarsPage` must NOT read `searchParams`/`cookies()`
> directly (forbidden in `use cache`). `page.tsx` reads `searchParams`, parses to
> `CarFilters`, and passes it as an **argument**. (Per the `use-cache` doc constraints.)

> ⚠️ Count over the ~935k-row `car_listings` is single-table (no join/dedupe) but can
> still be slow for broad filters. Mitigations: cache it (`getCarsCount` with
> `cacheLife("hours")`), and/or show "1000+" above a threshold (a `LIMIT 1001` existence
> check) instead of an exact `COUNT(*)`. Start with cached exact count; downgrade if p95
> is bad.

---

## 5. Filters → SQL (Drizzle)

Build a single `and(...)` from the parsed `CarFilters`. All facet values are clean
(see §0), so predicates are direct equality/range — no normalization layer.

**Every filter is a column on `car_listings`** (see `ALL-CARS-DB-DESIGN.md` §4–6) →
single-table, zero joins, no dedupe at query time. Display fields are denormalized onto
the row too, so the card needs no join either.

| Filter | Predicate (on `carListings`) |
| --- | --- |
| base | none — the table only contains active+img cars, one row per car, by construction |
| brand | `eq(carListings.manufacturerId, brandExternalId)` |
| model | `eq(carListings.modelId, modelExternalId)` |
| color | `eq(carListings.carColor, value)` |
| drive | `eq(carListings.driveWheel, value)` (`front`/`all`/`rear`) |
| year | `eq(carListings.carYear, value)` |
| priceMin/Max | range on `carListings.effectivePrice` (precomputed; legacy buy_now→final_bid→bid precedence, zeros nulled) |
| channel (tab) | `buy-now`→`eq(carListings.buyNow, true)` (effectivePrice>0 implied); `auction`→`ne(buyNow,true)`; undefined→no predicate |
| market (tab) | us→`eq(locationCountry,'USA')`; kr→`eq(…,'kr')`; ca→`eq(…,'Canada')` (NOT `domainName` — site ≠ country) |
| search | `or(ilike(carListings.lotNumber, 'q%'), eq(carListings.vin, q))` (both columns on the row) |
| keyset | `lt(carListings.sortId, cursor)` when present; `orderBy(desc(sortId))`, `limit(PAGE+1)` |

Notes:
- **market = `location_country`, not `domain_name`** (corrected after the live probe):
  `domain_name` is the auction *site* (copart/iaai/encar) → it backs the source *badge*;
  the *country* lives in `location_country` (USA / Canada / kr). IAAI & Copart each carry
  both US and Canadian cars, so all three tabs (САЩ/Корея/Канада) are real:
  USA 745k · kr 233k · Canada 12k. A tiny `rb` 2.8k bucket isn't a tab → only in "Всички".
- **brand/model values**: store the **external id** in the URL for a robust query, but
  render a human label (the row carries `brandName`/`modelName`) + ideally a slug for
  pretty URLs. MVP: external id in the query param; nice-URL `/marka/{slug}` is a
  follow-up (legacy had it via `samix_get_brand_slug_map`).
- Add a **zod schema** `schemas/car-filters.schema.ts` to parse/clamp params on the
  server (price ≥ 0, year in range, market enum, etc.) — reuse in the action.
- **Indexes + `EXPLAIN` acceptance bar**: `ALL-CARS-DB-DESIGN.md` §6/§9. Prerequisite for
  acceptable latency, not optional.

### Facets (`get-car-facets.query.ts`, `"use cache"` + `cacheLife("days")`)

- brands: `SELECT m.external_id, m.name FROM manufacturers m WHERE cars_qty>0 ORDER BY name`
  (reference table — cheap), or `SELECT DISTINCT manufacturer_id` off `car_listings` for
  "brands that actually have active cars".
- modelsByBrand: from `vehicle_models` keyed by `manufacturer_external_id` (load the
  selected brand's models on demand, or ship all 3400 once like the legacy
  `samixGridData.brandModels` localize — measure payload; lazy via the action is safer).
- colors / drives / years: `SELECT DISTINCT car_color FROM car_listings …` (≤ ~16 colors,
  3 drives, ~35 years — tiny; loose index scan). Cache hard; these change rarely.
- Map raw → BG labels via `car-labels.ts`.

---

## 6a. Market + buy-now as segmented controls (per the mockup)

The provided filter mockup surfaces **market** as a 4-segment control
(`🌍 Всички · KR Корея · US САЩ · CA Канада`) and **buy-now** as a `Само с Buy Now`
toggle, both sitting in the filter bar next to Лот №/VIN — while brand/model/color/drive/
year/price are the dropdowns above. We implement exactly that. (This is the same data as
"channel + market tabs"; the mockup just styles market as a segmented control and buy-now
as a toggle rather than a tab strip — fine, identical mechanics.)

```
МАРКА ▾   МОДЕЛ ▾   ЦВЯТ ▾   ЗАДВИЖВАНЕ ▾
ГОДИНА ОТ   ГОДИНА ДО   ЦЕНА ОТ   ЦЕНА ДО
ЛОТ № / VIN […]      ПАЗАР [🌍 Всички | KR | US | CA]   ( ) Само с Buy Now
[ ТЪРСИ ]  [ Изчисти ]
```

**Why market/buy-now are page-level controls (not a per-card switcher), proven by data:**
- Per-car channel availability is effectively disjoint: **210,092 cars buy-now-only,
  702,802 auction-only, only 45 cars BOTH.** A per-card buy-now/auction toggle would be
  dead UI on 99.995% of cards → rejected. Buy-now is a property *of the car*.
- **Market is a near-perfect partition:** a car spans multiple countries in only **4 of
  931k** cases (measured on `location_country`). So the segmented control never
  meaningfully hides or duplicates a car.
- Bonus: because a car is essentially buy-now-only *or* auction-only, the relisting
  **pick-strategy** (`ALL-CARS-DB-DESIGN.md` §4) only disambiguates *auction-relisted*
  cars; the "which face of the car?" ambiguity disappears.

**Mechanics (no new data needed):** these are just the `channel` + `market` fields of
`CarFilters`, backed by `car_listings.buy_now` + `car_listings.location_country`. The
mockup uses an explicit `ТЪРСИ` (Search) button, so unlike instant-apply filters the form
**stages** changes and submits on click → push the URL
(`?market=us&channel=buy-now&brand=…`), server re-renders page 1, grid + cursor reset
(§6). `Изчисти` (Clear) resets to the bare route. (We can also make dropdowns
instant-apply later; the legacy page was submit-based, so match it first.)

> **Legacy note:** the WP `saa_market` had `kr/us/ca`; this restores **all three** —
> earlier drafts wrongly dropped CA after reading `domain_name` (the auction site) instead
> of `location_country` (the car's country). Corrected.

**Market placement — RECOMMENDATION (kept, reconciled with the mockup):** market stays a
prominent **segmented control in the filter bar** (as mocked), not hidden in a dropdown.
Reasoning: (1) it's a top-level *audience* split (Корея vs САЩ/Канада import) buyers
self-select on — a primary axis, not a refinement like color; (2) near-lossless partition,
so a prominent control never misleads; (3) mirrors the legacy mental model. If you later
want it even more prominent, promote it to a tab row above the bar — same field, no data
change. Hierarchy reads "what kind of deal →
which market → refine." If horizontal space is tight on mobile, the market row collapses
into a segmented control; it does **not** go into the drawer (it's navigation, not a
filter).

---

## 6. Virtualized infinite grid (client)

Use **`@tanstack/react-virtual`** (`^3`) — not currently installed; add to
`apps/web` deps (`pnpm --filter @auctions-ingestion/web add @tanstack/react-virtual`).
It's the standard headless virtualizer, works with a responsive CSS grid by
virtualizing **rows** of N columns.

`<AllCarsGrid>` (`"use client"`):
- Props: `initialPage: CarsPage`, `filters: CarFilters`, `total: number`.
- State: `cars` (seeded from `initialPage.cars`), `cursor` (`initialPage.nextCursor`),
  `isLoading`, `done` (`cursor === null`).
- **Responsive columns**: compute `columnsPerRow` from a `ResizeObserver` on the
  container (1 on mobile, 2–3–4 by breakpoint, matching the legacy grid CSS).
  `rowCount = ceil(cars.length / columnsPerRow)`.
- `useWindowVirtualizer` (page scrolls, not an inner box — better for SEO/mobile and
  matches the legacy full-page scroll). `estimateSize` ≈ card height; `overscan: 3`.
- **Infinite trigger**: when the last virtual row index ≥ `rowCount - 2` and `!isLoading
  && !done`, call `loadMoreCars(filters, cursor)` (wrap in `useTransition`), append,
  advance cursor. (Virtualizer-driven trigger is more reliable than a separate
  IntersectionObserver sentinel, though a sentinel fallback is fine too.)
- Render only virtual rows; each row maps its slice of `cars` → `<AuctionCard>`.
- Variable card heights (info grid has conditional rows) → use
  `virtualizer.measureElement` ref on each row so heights self-correct.
- Reset (`cars=initialPage.cars`, scroll top) when `filters`/`initialPage` identity
  changes (filter navigation remounts via `key={JSON.stringify(filters)}` on the grid).

Edge cases: empty result → render the legacy "Няма налични коли по избраните филтри."
empty state. Failed `loadMoreCars` → keep loaded cards, show a "Зареди още" retry button
(graceful degrade; the action can reject).

> **SEO**: first page is real SSR HTML (server-rendered `<AuctionCard>`s in the initial
> `cars`), so crawlers see content without running the virtualizer. Subsequent pages are
> JS-only (expected for infinite scroll). Keep the `<h1>` + count + filter state in SSR.

---

## 7. Card link / detail route

Legacy links to `/auction-car/{car_id}/`. **No detail page exists in `apps/web` yet.**
Options:
- **MVP (chosen default):** mapper keeps the homepage behavior — `href` → section page
  (`/коли-за-продажба/` for buy-now, `/внос/` for auction). Card still fully renders;
  "Подробности" just doesn't deep-link yet. Matches what `car-mapper.ts` already does.
- **Follow-up:** add `src/app/avtomobil/[id]/page.tsx` (or `/auction-car/[id]`) and point
  `href` at `/avtomobil/${row.carId}/` (the `car_listings` row carries both `car_id` and
  the chosen `lot_id`). Out of scope here; one mapper line to change later.

---

## 8. Navigation + routing wiring

- `functions.php` links "Автомобили" → `/всички-автомобили/`. Add the route folder
  `src/app/всички-автомобили/` (Cyrillic segment — Next handles it; the existing
  `/коли-за-продажба`, `/внос` links in code are already Cyrillic, so this is consistent).
- Add the nav link in `src/data/navigation.ts` / `site-header` (check current nav items).
- `metadata` export on `page.tsx`: title/description (port from Yoast/the WP page if
  present; otherwise "Всички автомобили | SelectAuto").

---

## 9. Caching & invalidation

- `getCarsPage` / `getCarsCount`: `cacheTag(CACHE_TAGS.cars)` + `cacheLife("hours")`.
- `getCarFacets`: `cacheTag(CACHE_TAGS.cars)` + `cacheLife("days")`.
- Ingestion/refresh path (when listings change) calls `revalidateTag(CACHE_TAGS.cars,
  "max")` — the **two-arg** form (single-arg is deprecated in Next 16; already noted in
  AGENTS.md). The homepage `buyNowCars`/`auctionCars` tags already exist; reuse the
  umbrella `cars` tag so one invalidation covers all listing surfaces.
- No per-request dynamic API is read inside cached scopes (filters passed as args), so
  PPR streams a static shell + cached list. `loading.tsx` covers the first paint.

---

## 10. Build order (each step ends green: type-check + lint + `next build`)

0. **DB foundation (do first — `ALL-CARS-DB-DESIGN.md` §7+§9; PROD, so additive-only):**
   migration `0006_car_listings.sql` (`CREATE TABLE IF NOT EXISTS`, apply via `pnpm
   migrate`) + `schema.ts` mirror; backfill script `packages/db/backfill-car-listings.mjs`
   (car_id batches, actionable-first pick §4); `CREATE INDEX CONCURRENTLY` the §6 set;
   `ANALYZE`; wire **set-based** `recompute_car_listings(car_ids)` into the TWO real write
   fns in `packages/functions/shared/db.ts` — `upsertCarsAndLots` (collect written carIds)
   and `archiveLots` (`RETURNING car_id`; **must not skip** — promotes/deletes the card);
   run `EXPLAIN ANALYZE` + per-car-uniqueness acceptance. Purely additive: nothing reads
   the table until the page ships, and `DROP TABLE` + revert 2 edits fully reverses it.
   **Also (small, additive, belongs here): persist the API's `lot.archived`/`archived_at`**
   in `normalizeLot` + `upsertCarsAndLots` so an archived lot arriving via detail-refresh
   isn't wrongly written `archived=false` (DB doc §7 — makes the `archived=false` filter
   trustworthy). **Everything below depends on this.** (Largest piece — see DB doc §7/§9.)
1. **Types + labels + filter parse/serialize** (`car.type` extend, `car-filters.type`,
   `car-filters.ts`, `car-labels.ts`, `schemas/car-filters.schema.ts`). Pure, no UI.
2. **Mapper** — `toCarView` maps a **`car_listings` row** → `CarView` (BG labels for
   condition/drive/transmission; format price/mileage/date). It's a single-row mapper now
   (no lot+car join shape). Update `FALLBACK_*` arrays for the new required
   `id`/`isAuction`/`hasBuyNow` so the homepage stays green.
3. **Queries** — `getCarFacets`, `getCarsCount`, `getCarsPage` (keyset over `car_listings`).
   Test via a temp script against live DB before wiring UI.
4. **Presentational card** — `AuctionCard` (source/BUY-NOW badges, status bar, info grid,
   price, **per-card phone/Viber overlay** from `CONTACT`/Viber in `constants` + the
   `icons/` phone/viber SVGs, "Подробности" → section page) + `AuctionCountdown` + skeleton.
   Render a static page of mapped cars to verify visuals vs the legacy CSS.
5. **Server Action** — `loadMoreCars`; smoke-test it returns page 2 for a cursor.
6. **Grid** — add `@tanstack/react-virtual`; `AllCarsGrid` with window virtualization +
   action-driven infinite load + responsive columns + reset-on-filter.
7. **Channel/market tabs + filter bar + drawer** — `ChannelTabs` (Всички/Buy Now/Аукциони
   + market sub-row, §6a) and the attribute filter bar (brand→model dependency via lazy
   models or shipped facet map) + mobile bottom-sheet; tab/filter changes push the URL.
8. **Route + page.tsx + loading.tsx + nav link + metadata** — assemble SSR shell,
   stream the grid, wire `searchParams` → filters. **This completes the catalog (the
   deliverable).** Final pass: type-check + lint + build, then manual run + verify against
   prod data (`pnpm --filter @auctions-ingestion/web dev`).
   _(Detail page `/avtomobil/[id]` is a separate follow-up — not part of this build.)_

---

## 11. Open questions / risks to watch

- **`car_listings` sync**: the projection table must be recomputed on every lot/car
  mutation — **especially archive/unarchive** (which adds/removes/swaps a card) — plus
  backfilled + drift-guarded (`ALL-CARS-DB-DESIGN.md` §7). This is the main new
  operational surface this feature introduces; confirm every ingestion write path calls
  `recompute_car_listing` before shipping.
- **`COUNT(*)` latency** on broad filters over 1M rows (cache it; consider "1000+" above a
  threshold — §4 + DB-design §6).
- **Index coverage** is the make-or-break for keyset+filter latency (DB-design §5/§9).
- **Models payload**: shipping all 3400 models to the client vs lazy-loading per brand
  (legacy shipped all via `wp_localize_script`). Default to lazy (action) unless the
  full map is < ~50KB gzipped.
- **Pretty brand URLs** (`/marka/{slug}`) deferred — MVP uses query params.
- **Detail page** deferred (§7) — single mapper line to switch later.
- **"Тип продавач" + galleries** not in Neon — accepted gaps (§1).
