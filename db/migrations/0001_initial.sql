-- 0001_initial.sql
-- Initial schema for the AuctionsAPI ingestion database (Neon Postgres).
-- Keep this in sync with db/schema.ts (Drizzle). This plain SQL file is what
-- actually runs in production (via `psql` / the migrate script) so that no
-- migration runner needs to ship inside Lambda.
--
-- Idempotency notes:
--   * All unique constraints below back the ON CONFLICT upserts in
--     functions/shared/db.ts. Reprocessing the same page is always safe.
--   * raw_json columns retain the full upstream payload for future reprocessing.

BEGIN;

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id                SERIAL PRIMARY KEY,
  external_car_id   BIGINT,
  vin               TEXT,
  title             TEXT,
  year              INTEGER,
  manufacturer_id   BIGINT,        -- AuctionsAPI manufacturer.id (external)
  model_id          BIGINT,        -- AuctionsAPI model.id (external)
  generation_id     BIGINT,        -- AuctionsAPI generation.id (external)
  body_type         TEXT,
  color             TEXT,
  fuel_type         TEXT,
  transmission      TEXT,
  drive_wheel       TEXT,
  engine            TEXT,
  raw_json          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique only when external_car_id is present (NULLs are distinct in Postgres),
-- which supports the "no external id" fallback path.
CREATE UNIQUE INDEX IF NOT EXISTS cars_external_car_id_ux ON cars (external_car_id);
CREATE INDEX IF NOT EXISTS cars_vin_idx ON cars (vin);

-- ---------------------------------------------------------------------------
-- auction_lots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_lots (
  id                SERIAL PRIMARY KEY,
  external_lot_id   BIGINT,
  car_id            INTEGER REFERENCES cars (id) ON DELETE SET NULL,
  lot_number        TEXT NOT NULL,
  domain_id         INTEGER NOT NULL,
  domain_name       TEXT,
  status            TEXT,
  sale_date         TIMESTAMPTZ,
  odometer_km       BIGINT,
  bid_price         NUMERIC(14, 4),   -- prices can be fractional (e.g. 15530.14)
  buy_now_price     NUMERIC(14, 4),
  final_bid         NUMERIC(14, 4),
  buy_now           BOOLEAN,
  condition         TEXT,
  damage_main       TEXT,
  seller            TEXT,
  location_country  TEXT,
  location_state    TEXT,
  location_city     TEXT,
  image_url         TEXT,
  archived          BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at       TIMESTAMPTZ,
  raw_json          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary identity for a lot: (domain_id, lot_number). Reliable even when
-- external ids / VIN are missing or duplicated.
CREATE UNIQUE INDEX IF NOT EXISTS auction_lots_domain_lot_ux ON auction_lots (domain_id, lot_number);
CREATE INDEX IF NOT EXISTS auction_lots_car_id_idx ON auction_lots (car_id);
CREATE INDEX IF NOT EXISTS auction_lots_status_idx ON auction_lots (status);
CREATE INDEX IF NOT EXISTS auction_lots_archived_idx ON auction_lots (archived);

-- ---------------------------------------------------------------------------
-- manufacturers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manufacturers (
  id            SERIAL PRIMARY KEY,
  external_id   BIGINT NOT NULL,
  name          TEXT,
  image_url     TEXT,
  cars_qty      INTEGER,
  raw_json      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS manufacturers_external_id_ux ON manufacturers (external_id);

-- ---------------------------------------------------------------------------
-- vehicle_models
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_models (
  id                        SERIAL PRIMARY KEY,
  external_id               BIGINT NOT NULL,
  manufacturer_external_id  BIGINT,
  name                      TEXT,
  image_url                 TEXT,
  cars_qty                  INTEGER,
  raw_json                  JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_models_external_id_ux ON vehicle_models (external_id);
CREATE INDEX IF NOT EXISTS vehicle_models_manufacturer_idx ON vehicle_models (manufacturer_external_id);

-- ---------------------------------------------------------------------------
-- vehicle_generations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_generations (
  id                SERIAL PRIMARY KEY,
  external_id       BIGINT NOT NULL,
  model_external_id BIGINT,
  name              TEXT,
  from_year         INTEGER,
  to_year           INTEGER,
  raw_json          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_generations_external_id_ux ON vehicle_generations (external_id);
CREATE INDEX IF NOT EXISTS vehicle_generations_model_idx ON vehicle_generations (model_external_id);

-- ---------------------------------------------------------------------------
-- sync_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_runs (
  id                  SERIAL PRIMARY KEY,
  flow_type           TEXT NOT NULL,
  status              TEXT NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ,
  pages_processed     INTEGER NOT NULL DEFAULT 0,
  last_page_processed INTEGER NOT NULL DEFAULT 0,
  records_processed   BIGINT  NOT NULL DEFAULT 0,
  error_message       TEXT,
  metadata_json       JSONB
);
CREATE INDEX IF NOT EXISTS sync_runs_flow_status_idx ON sync_runs (flow_type, status);

COMMIT;
