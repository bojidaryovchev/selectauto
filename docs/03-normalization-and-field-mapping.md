# 03 — Normalization & Field Mapping

How raw AuctionsAPI payloads become DB rows. Implemented in
[`packages/functions/shared/normalize.ts`](../packages/functions/shared/normalize.ts);
the raw payload types are in [`shared/types.ts`](../packages/functions/shared/types.ts).

## Design rules (apply to every mapping below)

1. **Never assume a field exists.** Every access is guarded; missing → `null`.
   The `Api*` types mark almost everything optional precisely to force this.
2. **Always keep `raw_json`.** The full upstream object is stored on every row so
   new columns can be backfilled later without re-pulling from the API. This
   already paid off: `cars.vehicle_type` (migration 0013) was added later and
   backfilled for ~1.1M existing rows **straight from `raw_json`**
   (`raw_json->'vehicle_type'->>'name'`) — zero API calls. The one-off backfill
   script was removed after it ran; new rows are populated by `normalizeCar` above.
3. **Where a mapping is uncertain, leave it in `raw_json`** rather than guessing a
   column. Many observed fields (seller_type, detailed_title, auction_type,
   airbags, grade_iaai, selling_branch, lat/long, postal_code, the `prices`
   history array, ...) are retained **only** in raw_json today.

---

## Coercion helpers (the defensive primitives)

| Helper | Behavior |
|---|---|
| `num(v)` | `null` if null/undefined; else `Number(v)` if finite, else `null`. |
| `str(v)` | `null` if null/undefined; else `String(v).trim()`, and **`""` → `null`** (empty strings are normalized away). |
| `coerceValueNum(v)` | If `v` is `{ value }` → `num(v.value)`; else `num(v)`. **Handles scalar AND `{value}` wrapper.** |
| `coerceValueStr(v)` | String variant of the above (for `sale_date` as scalar or `{value}`). |
| `buyNowFlag(v)` | `coerceValueNum(v)` then `n === null ? null : n > 0`. Derives the boolean from a price. |
| `firstImage(raw)` | Prefer `images.downloaded[0]` (CDN, our-domain, stable); else `images.normal[0]`; else `null`. |

### Why `coerceValueNum` exists — the two price shapes
The single most important normalization quirk: **`/cars` sends scalar prices**
(`buy_now: 0`, `bid: null`) while **`/archived-lots` sends `{ value, updated_at }`
wrappers** (`bid: { value: 8300 }`). One normalizer must handle both, so every
price/date goes through `coerceValue*`. See [01 §6](01-auctionsapi-consumption.md#6-payload-shapes).

---

## `normalizeCar(raw)` → `cars` row

| `cars` column | Source | Coercion |
|---|---|---|
| `external_car_id` | `raw.id` | `num` |
| `vin` | `raw.vin` | `str` |
| `title` | `raw.title` | `str` |
| `year` | `raw.year` | `num` |
| `manufacturer_id` | `raw.manufacturer.id` | `num` — **stores the ID, not the name** |
| `model_id` | `raw.model.id` | `num` |
| `generation_id` | `raw.generation.id` | `num` |
| `body_type` | `raw.body_type.name` | `str` |
| `vehicle_type` | `raw.vehicle_type.name` | `str` — top category (automobile/truck/boat/…); added with migration 0013 |
| `color` | `raw.color.name` | `str` |
| `fuel_type` | `raw.fuel.name` | `str` — **field renamed** `fuel` → `fuel_type` |
| `transmission` | `raw.transmission.name` | `str` |
| `drive_wheel` | `raw.drive_wheel.name` | `str` |
| `engine` | `raw.engine.name` | `str` — keeps the human string; `engine.id` only in raw_json |
| `raw_json` | `raw` (entire object) | — |

Note the asymmetry: for `manufacturer`/`model`/`generation` we keep the **id**
(to join reference tables); for `body_type`/`color`/`fuel`/`transmission`/
`drive_wheel`/`engine` we keep the **name** (it's the displayable value).

---

## `normalizeLot(raw)` → `auction_lots` row (active flow, from `/cars`)

| `auction_lots` column | Source | Coercion / note |
|---|---|---|
| `external_lot_id` | `raw.id` | `num` |
| `lot_number` | `raw.lot` | `String(...)` if present, else null — number **or** string upstream, coerced to string for the key |
| `domain_id` | `raw.domain.id` | `num` |
| `domain_name` | `raw.domain.name` | `str` |
| `status` | `raw.status.name` | `str` |
| `sale_date` | `raw.sale_date` | `str` (ISO; Postgres casts to timestamptz) |
| `odometer_km` | `raw.odometer.km` | `num` |
| `bid_price` | `raw.bid` | `coerceValueNum` |
| `buy_now_price` | `raw.buy_now` | `coerceValueNum` |
| `final_bid` | `raw.final_bid` | `coerceValueNum` |
| `buy_now` (bool) | `raw.buy_now` | `buyNowFlag` → `true` when price > 0 |
| `condition` | `raw.condition.name` | `str` |
| `damage_main` | `raw.damage.main.name` | `str` |
| `seller` | `raw.seller.name` | `str` |
| `location_country` | `raw.location.country.name` | `str` |
| `location_state` | `raw.location.state.name` | `str` |
| `location_city` | `raw.location.city.name` | `str` |
| `image_url` | `firstImage(raw)` | downloaded[0] → normal[0] → null |
| `archived` | `raw.archived` | only if a real boolean, else `null` (see below) |
| `archived_at` | `raw.archived_at` | `str` |
| `raw_json` | `raw` | — |

### The `archived` handling (why it's nullable here)
`archived` is coerced **only when the payload actually carries a boolean**,
otherwise `null`. This is deliberate: the live `/cars` feed sends `archived:
null` for active lots (historically documented as `false`; confirmed `null`
against the live API 2026-06 — in both cases *not* `true`), but the **detail
endpoints** can return `archived: true, status: "sold"` for a directly looked-up
concluded lot. The upsert then does:

```sql
archived = CASE WHEN $20::boolean IS NULL
                THEN auction_lots.archived          -- absent → keep existing state
                ELSE $20::boolean END               -- present → honor the API
```

So a missing `archived` never flips a previously-archived lot back to active, and
a detail refresh that reports `archived:true` is respected. This is what makes the
`car_listings.archived = false` filter trustworthy (no resurrection guessing).

---

## `normalizeArchivedLot(raw)` → `auction_lots` row (archive flow, from `/archived-lots`)

The `/archived-lots` payload is a **flat** record (not car+lots) with **`{value}`
wrappers** on prices/dates. It maps onto the *same* `auction_lots` columns so the
archive handler can upsert via `(domain_id, lot_number)` just like the active flow.

| `NormalizedArchivedLot` field | Source | Coercion |
|---|---|---|
| `externalLotId` | `raw.lot_id` | `num` |
| `externalCarId` | `raw.car_id` | `num` — AuctionsAPI external car id, for linkage |
| `vin` | `raw.vin` | `str` |
| `lotNumber` | `raw.lot` | string coerce |
| `domainId` / `domainName` | `raw.domain.{id,name}` | `num` / `str` |
| `status` | `raw.status.name` | `str` |
| `bidPrice` | `raw.bid` | `coerceValueNum` (unwraps `{value}`) |
| `buyNowPrice` | `raw.buy_now` | `coerceValueNum` |
| `finalBid` | `raw.final_bid` | `coerceValueNum` |
| `saleDate` | `raw.sale_date` | `coerceValueStr` (unwraps `{value}`) |
| `archivedAt` | `raw.archived_at` | `str` |
| `rawJson` | `raw` | — |

> **Car linkage during archive.** The payload carries the **external** car id
> (`car_id`), but `auction_lots.car_id` is a **local** FK to `cars.id`. The
> upsert resolves it with a subquery `(SELECT id FROM cars WHERE external_car_id =
> $2)`. If the car isn't in our DB yet, that yields NULL and `COALESCE` keeps any
> existing link (on conflict) or leaves it NULL (on fresh insert). See
> [04](04-ingestion-flows.md#flow-3--hourly-archived-lots).

---

## Reference normalizers

Field names **confirmed against the live API (2026-06)**.

### `normalizeManufacturer(raw)` → `manufacturers`
`external_id` ← `id`, `name` ← `name`, `image_url` ← `image`, `cars_qty` ←
`cars_qty`, `raw_json` ← raw.

### `normalizeModel(raw)` → `vehicle_models`
`external_id` ← `id`, `manufacturer_external_id` ← `manufacturer_id`, `name` ←
`name`, `image_url` ← **always `null`** (models endpoint has no image; column kept
for schema symmetry), `cars_qty` ← `cars_qty`, `raw_json` ← raw.

### `normalizeGeneration(raw)` → `vehicle_generations`
`external_id` ← `id`, `model_external_id` ← `model_id`, `name` ← `name`,
`from_year` ← `from_year`, `to_year` ← `to_year`, `raw_json` ← raw.

In the reference handlers, if a record's `externalId` is `null` it is **skipped**
(can't key it). When a child's parent id is missing, the handler falls back to the
parent it was fetched under (`mod.manufacturerExternalId ?? manufacturerExternalId`,
`g.modelExternalId ?? mod.externalId`).

---

## Rows that are skipped (logged, not written)

- **Active lot with no `(domain_id, lot_number)`** → `skip_lot_missing_key`
  warning, lot skipped (can't dedupe safely). The car row is still written.
- **Archived lot with no `(domain_id, lot_number)`** → silently `continue`d.
- **Reference record with null external id** → `continue`d.

---

## i18n / cleanup boundary (where normalization stops)

Normalization **cleans structure** (guards, coercion, empty→null, one image
pick), but does **not** translate or scrub values:

- Enum values are stored as their **raw canonical English `.name`** (white/black,
  front/all/rear, sale/sold). Bulgarian labels are applied in the **app**
  (`apps/web/src/lib/car-labels.ts`), not in ingestion — facets need the raw value
  to group, and label tweaks shouldn't trigger a multi-hundred-thousand-row
  backfill.
- `engine` spec strings (`1.5l 4`, `LVL`, `8`), `title`, `seller`, and the long
  tail of `damage_main` are **verbatim passthrough**. Junk values are an upstream
  data-quality matter, deliberately out of scope for the card.

This is why the read-model recompute functions can denormalize these columns
directly from `cars`/`auction_lots` without any further transformation. See
[05](05-projection-tables-car-listings.md).
