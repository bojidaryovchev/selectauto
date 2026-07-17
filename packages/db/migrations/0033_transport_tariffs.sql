-- 0033_transport_tariffs.sql
-- US/Canada transport tariff tables for the import calculator (docs: техническо
-- задание §11 — import the tariffs into the DB; the calculator reads the DB, not
-- Excel, on every open). Admin-uploadable via /admin/tarifi.
--
-- Versioned: each upload is a `tariff_uploads` row; exactly one is `active`, and
-- the calculator resolves inland/container against that version's rows. A DB miss
-- falls back to the generated static seed in apps/web/src/data/us-transport-tariffs.ts.
--
--   tariff_uploads      — one row per upload (audit + the active pointer).
--   us_inland_tariffs   — per auction+location: preferred terminal + inland USD (+$235).
--   us_container_prices — per config+terminal: price per 1 car, USD (+$105 on 3/4-car).
--
-- Keep in sync with the pgTables in packages/db/schema.ts.

CREATE TABLE IF NOT EXISTS tariff_uploads (
  id             SERIAL PRIMARY KEY,
  filename       TEXT NOT NULL,
  inland_rows    INTEGER NOT NULL,
  container_rows INTEGER NOT NULL,
  note           TEXT,
  active         BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tariff_uploads_active_idx ON tariff_uploads (active);

CREATE TABLE IF NOT EXISTS us_inland_tariffs (
  id        SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES tariff_uploads (id) ON DELETE CASCADE,
  location  TEXT NOT NULL,
  auction   TEXT NOT NULL,
  city      TEXT,
  state     TEXT,
  zip       TEXT,
  terminal  TEXT NOT NULL,
  inland    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS us_inland_tariffs_upload_idx ON us_inland_tariffs (upload_id);

CREATE TABLE IF NOT EXISTS us_container_prices (
  id        SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES tariff_uploads (id) ON DELETE CASCADE,
  config    TEXT NOT NULL,
  terminal  TEXT NOT NULL,
  price     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS us_container_prices_upload_idx ON us_container_prices (upload_id);
