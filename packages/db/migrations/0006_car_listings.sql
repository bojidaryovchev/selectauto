-- 0006_car_listings.sql
-- Read model for the /всички-автомобили (all-cars) page: ONE row per physical
-- car that currently has at least one active, image-bearing lot. A pre-joined,
-- pre-deduped, pre-computed projection of (cars + its chosen auction_lots row),
-- so the page filters/sorts/paginates SINGLE-TABLE with zero joins and no
-- query-time DISTINCT (that GROUP BY car_id times out on the 1M-row live set).
--
-- Maintained incrementally by ingestion via recompute_car_listings(car_ids[])
-- (NOT a Postgres MATERIALIZED VIEW — a full REFRESH would re-run the timeout-
-- prone collapse wholesale). See apps/web/ALL-CARS-DB-DESIGN.md §4/§7.
--
-- This migration creates the TABLE ONLY. Indexes are added in a later step
-- AFTER the one-time backfill, so the bulk load isn't index-maintained per row.
-- Purely additive: nothing reads this table until the web page ships; DROP TABLE
-- fully reverses it. Keep in sync with the `carListings` pgTable in schema.ts.
--
-- Pick-strategy (which lot represents a multi-lot/relisted car): actionable-first
-- — a lot with an active status (sale/upcoming/future/on_approval/new_auction) or
-- a valid buy-now ranks above ended/sold; then soonest sale_date; then newest id.
-- Brand/model NAMES are deliberately NOT stored here (the daily reference sync can
-- change them without touching a lot); resolve names by id at read time.

BEGIN;

CREATE TABLE IF NOT EXISTS car_listings (
  -- identity
  car_id            INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  -- the lot that won the per-car collapse (detail link / debugging)
  lot_id            INTEGER NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,

  -- filter columns (all single-table, indexable)
  manufacturer_id   BIGINT,         -- cars.manufacturer_id (brand facet)
  model_id          BIGINT,         -- cars.model_id (model facet)
  car_year          INTEGER,        -- cars.year
  car_color         TEXT,           -- cars.color
  drive_wheel       TEXT,           -- cars.drive_wheel (front/all/rear)
  buy_now           BOOLEAN,        -- chosen lot's buy_now
  domain_name       TEXT,           -- chosen lot's source SITE -> badge (copart/iaai/encar)
  location_country  TEXT,           -- chosen lot's country -> MARKET tab (USA/Canada/kr/rb)
  lot_number        TEXT,           -- chosen lot's lot number (search)
  vin               TEXT,           -- cars.vin (search)
  effective_price   NUMERIC(14,4),  -- COALESCE(NULLIF(buy_now_price,0), NULLIF(final_bid,0), NULLIF(bid_price,0))

  -- sort key = chosen lot id (unique, monotonic) -> keyset cursor + "newest" order
  sort_id           INTEGER NOT NULL,

  -- display columns (denormalized so the card needs no join)
  title             TEXT,           -- cars.title
  image_url         TEXT,           -- chosen lot's image
  odometer_km       BIGINT,         -- chosen lot
  sale_date         TIMESTAMPTZ,    -- chosen lot
  status            TEXT,           -- chosen lot status -> card state pill (BG label in app)
  condition         TEXT,           -- chosen lot (raw key; BG label in app)
  damage_main       TEXT,           -- chosen lot (mostly passthrough; top values BG-mapped)
  seller            TEXT,           -- chosen lot
  transmission      TEXT,           -- cars.transmission
  -- raw price parts retained for exact "Buy Now vs Цена" card rendering
  buy_now_price     NUMERIC(14,4),
  bid_price         NUMERIC(14,4),
  final_bid         NUMERIC(14,4),

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
