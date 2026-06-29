# 01 — AuctionsAPI: What We Consume, How & Why

Upstream source: **AuctionsAPI** — `https://auctionsapi.com/api`. It aggregates
vehicle auction/listing data from **Copart**, **IAAI** and **Encar** and exposes
it over a single REST API. We are a paid consumer.

Client implementation: [`packages/functions/shared/auctionsApiClient.ts`](../packages/functions/shared/auctionsApiClient.ts).
Most upstream facts below were **confirmed against the live API (2026-06)**; the
field mappings are anchored to a real sample record in
[`docs/sample-cars-response.json`](sample-cars-response.json).

---

## 1. Authentication

```
x-api-key: <key>          ← header, NOT Bearer
accept: application/json
```

The key is injected into the Lambda as the `AUCTIONS_API_KEY` env var (sourced
from Secrets Manager / Pulumi config). The client reads
`process.env.AUCTIONS_API_KEY` and `process.env.AUCTIONS_API_BASE_URL`; it throws
on startup if either is unset.

> ⚠️ **Rotation note.** The key was shared in plaintext during setup and should
> be rotated.

---

## 2. The rate limit (the single most important constraint)

**1 request per second**, and it is a **global** budget across every flow — not
per-Lambda, not per-machine. Everything in the system is shaped around it:

- The **client itself does not throttle.** Pacing is the orchestrator's job.
- Paginated flows insert a Step Functions **`Wait 1s`** state between page fetches.
- The **combined hourly machine** runs cars **then** archived-lots *sequentially*
  (never in parallel) so two flows never spend the budget at once.
- The **reference sync** sleeps 1s between every upstream call (`RATE_LIMIT_MS`).
- The **detail-refresh worker** has `reservedConcurrency = 1` + a trailing 1s
  sleep, so no number of website users can exceed the budget.

Plan/demo limits (from the API docs, for context):

| | Demo key | Paid | Unlimited |
|---|---|---|---|
| `/cars` per request | 50 | up to 1000 | up to 1000 |
| `/manufacturers` | 3 items | full | full |
| total requests | ≤ 100 | — | — |

We use **`per_page = 1000`** (configurable via Pulumi `perPage`).

---

## 3. Endpoints we actually call

Only the endpoints below are wired in our client. (AuctionsAPI exposes more —
`/statistics`, `/korea-duplicates`, `/usa/*`, etc. — which we do **not** consume
yet. A future model-level price-stats SEO page may use `/statistics`.)

| Method / path | Client method | Used by | Why |
|---|---|---|---|
| `GET /cars` | `getCarsPage({page, perPage, minutes?})` | full backfill, hourly cars sync | Active inventory. The primary feed. |
| `GET /archived-lots` | `getArchivedLotsPage({page, perPage, minutes?})` | hourly archived sync | Detect sold/archived lots to mark inactive. |
| `GET /manufacturers/cars` | `getManufacturers()` | reference sync | Brand list. |
| `GET /models/{manufacturer_id}/cars` | `getModels(id)` | reference sync | Models for a brand. |
| `GET /generations/{model_id}/cars` | `getGenerations(id)` | reference sync | Generations for a model. |
| `GET /search-lot/{lot}/{domain}?prices_history=1` | `searchLot(lot, domain)` | detail refresh | One lot, fresh, with price history. |
| `GET /search-vin/{vin}?prices_history=1` | `searchVin(vin)` | detail refresh | One car by VIN, with price history. |

`{domain}` for `search-lot` is one of `copart_com`, `iaai_com`, `encar_com`.

### The `minutes` window (incremental sync)

`/cars` and `/archived-lots` accept `minutes=N` → "records added/updated in the
last N minutes" (max 4320). We run the hourly sync with **`minutes=75`**
(configurable via Pulumi `incrementalMinutes`) — a 60-minute schedule plus 15
minutes of overlap so nothing slips between runs. The **full backfill omits
`minutes`** entirely (all active cars).

---

## 4. Pagination — Laravel `simplePaginate` (no total!)

**Confirmed live.** Every paginated endpoint wraps results in:

```jsonc
{
  "data":  [ /* records */ ],
  "links": { "first": "...", "last": null, "prev": null, "next": "<url>|null" },
  "meta":  { "current_page": 1, "from": 1, "path": "...", "per_page": 1000, "to": 1000 }
}
```

The critical consequence: **there is no `total` and no `last_page`.** You cannot
know how many pages exist up front.

- **`links.next` is authoritative**: a URL string ⇒ another page exists; `null`
  ⇒ this is the last page.
- Past-the-end page = **HTTP 200, empty `data`, `links.next: null`** → loop ends
  cleanly.

Our client flattens any wrapper into a `NormalizedPage<T>`
([`types.ts`](../packages/functions/shared/types.ts)):

```ts
interface NormalizedPage<T> {
  data: T[];
  currentPage: number;
  nextPage: number | null;   // currentPage + 1 when hasNextPage, else null
  lastPage: number | null;   // null for AuctionsAPI (no last_page)
  hasNextPage: boolean;
  rawMeta?: unknown;         // { meta, links } kept for debugging
}
```

`hasNextPage` is computed (`normalizePage`) with belt-and-suspenders fallbacks:

1. If `links.next` is present → use it (URL ⇒ true, null ⇒ false). **Primary.**
2. Else if `meta.last_page` exists → `currentPage < lastPage`. (Never happens for
   AuctionsAPI, kept for any endpoint that adds it.)
3. Else → `data.length >= perPage && data.length > 0` (short/empty page ⇒ stop).

On top of that, the loop helper [`pagination.ts`](../packages/functions/shared/pagination.ts)
adds a **hard stop on empty data** regardless of metadata, so a bad `links.next`
can never cause an infinite loop.

---

## 5. Error handling & retry classification

`getJson` throws a typed `AuctionsApiError(message, statusCode, retryable, body)`.
The `retryable` flag drives the Step Functions retry policy:

| Condition | `retryable` | Behavior |
|---|---|---|
| Network error / timeout (30s default) | `true` | SFN retries (backoff) |
| HTTP **429** (rate limited) | `true` | SFN retries (backoff) |
| HTTP **5xx** | `true` | SFN retries (backoff) |
| HTTP **4xx** (other than 429) | `false` | Terminal — fails the run |
| 2xx with unparseable JSON | `true` (once) | Retried |

Step Functions matches on the JS error **name** (`AuctionsApiError`) — see the
retry policy in [04-ingestion-flows.md](04-ingestion-flows.md#retry-policy).

---

## 6. Payload shapes

### 6a. `/cars` (and `/search-lot`, `/search-vin`) — car with nested lots

A **car** record with a nested `lots[]` array. Detail endpoints return the same
shape wrapped in `{ data: <car> }`, plus a `lots[].prices` history array (because
we request `prices_history=1`). See the full real sample in
[`sample-cars-response.json`](sample-cars-response.json). Abridged:

```jsonc
{
  "id": 267,                                  // -> cars.external_car_id
  "year": 2015,
  "title": "2015 BMW 328I xDrive",
  "vin": "WBA3B5G55FNS17722",
  "manufacturer": { "id": 16, "name": "BMW" },// -> cars.manufacturer_id (the ID)
  "model":        { "id": 93, "name": "3er" },// -> cars.model_id
  "generation":   { "id": 413, "name": "VI (F3x)" },
  "body_type":    { "name": "sedan", "id": 1 },
  "color":        { "name": "blue", "id": 11 },
  "engine":       { "id": 7124, "name": "2.0l i-4 ..." }, // -> cars.engine = .name
  "transmission": { "name": "automatic", "id": 1 },
  "drive_wheel":  { "name": "all", "id": 3 },
  "fuel":         { "name": "gasoline", "id": 4 },        // -> cars.fuel_type = .name
  "cylinders": 4,
  "lots": [
    {
      "id": 20421492,                         // -> auction_lots.external_lot_id
      "lot": "45289258",                      // -> auction_lots.lot_number
      "domain": { "name": "iaai_com", "id": 1 },          // -> domain_id / domain_name
      "odometer": { "km": 392064, "mi": 243617, "status": {...} },
      "sale_date": null,
      "bid": null,         "buy_now": 0,       "final_bid": null,   // SCALAR prices here
      "status":    { "name": "sale", "id": 3 },
      "condition": { "name": "run_and_drives", "id": 0 },
      "damage":    { "main": { "name": "Rear" }, "second": {...} },
      "seller":    { "name": "Progressive", "is_insurance": true },
      "images":    { "downloaded": ["https://i.auctionsapi.com/.../...-1.webp"] },
      "location":  { "country": {"name":"USA"}, "state": {...}, "city": {...} },
      "archived": false, "archived_at": null  // present on every lot (see note)
      // many more fields (seller_type, title, detailed_title, auction_type, ...)
      // are retained only in raw_json
    }
  ]
}
```

**In `/cars`, prices are SCALARS** (`buy_now: 0`, `bid: null`). This differs from
`/archived-lots` (below). Our normalizer handles both forms.

> **`archived` on the lot.** Every lot object carries an `archived` field +
> `archived_at`. In the live `/cars` feed `archived` is usually **`null`** for
> active lots (historically documented as `false`; confirmed `null` against the
> live API 2026-06) — either way it is **not `true`**. The **detail endpoints can
> return `archived: true, status: "sold"`** for a directly looked-up concluded
> lot. The normalizer keeps the value only when it's a real boolean (else `null`),
> and the upsert defaults a fresh insert to `false` (`COALESCE($archived, FALSE)`)
> and otherwise keeps the existing state when the field is absent — so the active
> upsert never silently resurrects an archived lot, regardless of `false`-vs-`null`.
> See [03](03-normalization-and-field-mapping.md).

### 6b. `/archived-lots` — FLAT shape (different!), with `{value}` wrappers

**Confirmed live.** This endpoint does **not** return cars+lots. Each item is a
**flat** lot record, and the price/date fields are `{ value, updated_at }`
wrappers, not scalars:

```jsonc
{
  "archived_at": "2024-03-19T14:40:10Z",
  "lot_id": 1,                               // -> auction_lots.external_lot_id
  "car_id": 1,                               // AuctionsAPI external car id (for linkage)
  "vin": "5uxkr0c52e0c26684",
  "lot": "67283833",                         // -> lot_number
  "domain": { "name": "copart_com", "id": 3 },
  "status": { "name": "sold", "id": 6 },
  "bid":       { "value": 8300,  "updated_at": null },  // WRAPPED, not scalar
  "buy_now":   { "value": 8500,  "updated_at": ... },
  "sale_date": { "value": "2023-10-23T14:00:00Z", "updated_at": null },
  "final_bid": { "value": null,  "updated_at": null }
}
```

Because the two endpoints disagree on price shape, the normalizer's
`coerceValueNum`/`coerceValueStr` accept **both** a scalar and a `{value}`
wrapper. See [03](03-normalization-and-field-mapping.md#coercion-helpers).

### 6c. Reference endpoints — `{ data: [...] , links, meta }`

**Confirmed live.** Fields we map:

```jsonc
// /manufacturers/cars
{ "id": 48, "name": "Ford", "cars_qty": 93791, "image": "...ford.svg",
  "models_qty": 119, "cars": true, "motorcycles": false }

// /models/{manufacturer_id}/cars
{ "id": 93, "name": "3er", "cars_qty": 4746, "manufacturer_id": 16,
  "generations_qty": 7 }

// /generations/{model_id}/cars
{ "id": 397, "name": "V (E60/E61)", "cars_qty": 190,
  "from_year": 2002, "to_year": 2010, "manufacturer_id": 16, "model_id": 94 }
```

Catalog scale: ~424 manufacturers, ~5.5k models. ~3/4 of manufacturers have
`cars_qty = 0`; the reference sync skips those by default (saves the rate budget).

---

## 7. Enum reference (authoritative, from the API codebase)

`cars`/`auction_lots` store the **`.name`** string of each enum object (e.g.
`color = "blue"`, `status = "sale"`), not the numeric id. These tables map the
ids ↔ names. Useful when reading `raw_json`, building filters, or interpreting
the `status` precedence in the recompute functions.

### Platforms — `domain_id`
| id | name |
|----|------|
| 1 | IAAI |
| 3 | Copart |
| 12 | Encar.com |

### Statuses — `status` (`PriceStatusEnum`)
| id | name | | id | name |
|----|------|---|----|------|
| 1 | not_checked | | 5 | new_auction |
| 2 | not_on_sale | | 6 | sold |
| 3 | sale | | 7 | failed |
| 4 | on_approval | | 8 | not_sold |

> Also observed in practice/UI: `future`, `upcoming`. The "actionable" set used
> by the active read model is `sale, upcoming, future, on_approval, new_auction`;
> the "concluded" set used by the archived read model is `sold, not_sold, failed`.
> See [05](05-projection-tables-car-listings.md).

### Vehicle types — `vehicle_type` (`VehicleTypeEnum`)
| id | name | | id | name |
|----|------|---|----|------|
| 1 | automobile | | 9 | industrial_equipment |
| 2 | motorcycle | | 10 | mobile_home |
| 3 | trailers | | 11 | jet_sky (snowmobile) |
| 4 | truck | | 12 | watercraft |
| 5 | atv | | 13 | emergency_equipment |
| 7 | boat | | 14 | cargo_special_bus |
| 8 | bus | | | |

### Body types — `body_type` (`BodyTypeEnum`)
| id | name | | id | name | | id | name |
|----|------|---|----|------|---|----|------|
| 1 | sedan | | 11 | hatchback | | 21 | enduro_bike |
| 2 | wagon | | 12 | roadster | | 22 | hearse |
| 3 | coupe | | 13 | limousine | | 23 | fire_truck |
| 4 | pickup | | 14 | truck | | 24 | trailer |
| 5 | suv | | 15 | bike | | 25 | tandem |
| 6 | cabrio | | 16 | sport_bike | | 26 | garbage |
| 7 | van | | 17 | roadster_bike | | 27 | sport_car |
| 8 | moto | | 18 | industrial | | 100 | other |
| 9 | furgon | | 19 | bus | | | |
| 10 | combi | | 20 | liftback | | | |

### Colors — `color` (`ColorEnum`)
| id | name | | id | name | | id | name |
|----|------|---|----|------|---|----|------|
| 1 | silver | | 8 | brown | | 15 | black |
| 2 | purple | | 9 | grey | | 16 | yellow |
| 3 | orange | | 10 | turquoise | | 17 | beige |
| 4 | green | | 11 | blue | | 18 | pink |
| 5 | red | | 12 | bronze | | 100 | two_colors |
| 6 | gold | | 13 | white | | | |
| 7 | charcoal | | 14 | cream | | | |

### Fuel — `fuel_type` (`FuelEnum`)
| id | name | | id | name |
|----|------|---|----|------|
| 1 | diesel | | 5 | gas |
| 2 | electric | | 6 | flexible |
| 3 | hybrid | | 7 | hydrogen |
| 4 | gasoline | | | |

### Condition — `condition` (`ConditionEnum`)
| id | name | | id | name |
|----|------|---|----|------|
| 0 | run_and_drives | | 4 | used |
| 1 | for_repair | | 5 | unconfirmed |
| 2 | to_be_dismantled | | 6 | engine_starts |
| 3 | not_run | | 7 | enhanced |

### Transmission / drive wheel
`transmission`: 1 = automatic, 2 = manual.
`drive_wheel`: 1 = rear, 2 = front, 3 = all.

### Other enums
- **seller_type** (`SellerTypeEnum`): 1 = insurance, 2 = non_insurance. *(In the
  API on `lot.seller_type`; not yet stored in Neon — a noted follow-up.)*
- **odometer.status** (`OdometerStatusEnum`): 1 = actual, 2 = not_actual,
  3 = exempt, 4 = exceeds_mechanical_limits, 5 = hours.
- **airbags** (`AirbagEnum`): 1 = intact, 2 = deployed, 3 = missing, 4 = none.
- **language** (`LanguageEnum`): 1 = en, 2 = ru, 3 = uk, 4 = ro.

---

## 8. Filter parameters available on `/cars`

We do not currently send most of these (we ingest *everything* and filter in our
own `car_listings`), but they confirm that our column choices map 1:1 to the
upstream contract, and they're available if we ever push filtering upstream.

`minutes`, `per_page`, `manufacturer_id` (CSV ok), `model_id`, `generation_id`,
`from_year`, `to_year`, `year`, `vehicle_type`, `buy_now`, `domain_id`,
`search_query` (VIN or lot), `status` (or `status[]=`), `vin` (`_` for partial),
`name`, `document_title`, `cylinders`, `engine_name`, `body_type`, `color`,
`transmission`, `drive_wheel`, `country` (US/CA/KR), `state_code`, `fuel_type`,
`condition`, `damage`, `prices_history`, `sale_date_in_days`, `sale_date_from`,
`sale_date_to`, `next_hours_auction`, `exclude_expired_auctions`,
`without_sale_date`, `odometer_from_km`/`to_km`, `odometer_from_mi`/`to_mi`,
`buy_now_price_from`/`to`, `bid_price_from`/`to`, `simple_paginate`
(default `1` = no total; `0` = include total count).

> **Market mapping note.** "Market" on the website is **`location_country`**
> (USA / Canada / KR), *not* `domain_name` (which is the auction *site* → a
> source badge). `country` here is the matching upstream filter.

---

## 9. What we deliberately do NOT consume (yet)

- `/statistics` — average price/stats by manufacturer/model/generation/year.
  Candidate for a future SEO "what did X sell for" page.
- `/korea-duplicates`, `/korea-options` — Encar-specific helpers.
- `/usa/damages`, `/usa/states`, `/usa/cities/{state}`, `/usa/titles`,
  `/usa/branches` — USA reference lists. We store damage/location as free text on
  the lot instead.
- `seller_type`, image galleries (we keep one image), `lots[].prices` history as
  structured columns (kept only in `raw_json`). These are noted follow-ups.
  *(`vehicle_type` and `body_type` were such follow-ups but are now stored on
  `cars` and the projections — they power the website "Тип" filter.)*
