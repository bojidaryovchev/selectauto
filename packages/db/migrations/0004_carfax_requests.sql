-- 0004_carfax_requests.sql
-- Carfax check inquiries submitted from the website /carfax page.
-- Ported from the old WordPress `wp_sa_carfax_requests` table. Keep in sync with
-- the carfaxRequests table in schema.ts.
--
-- Website-write, low-volume lead data (not part of the AuctionsAPI ingestion),
-- so no raw_json column and no upsert/unique keys — every submission is a row.

BEGIN;

CREATE TABLE IF NOT EXISTS carfax_requests (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  vin         TEXT NOT NULL,
  car_make    TEXT,
  car_model   TEXT,
  message     TEXT,
  page_url    TEXT,
  user_ip     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carfax_requests_created_at_idx ON carfax_requests (created_at);
CREATE INDEX IF NOT EXISTS carfax_requests_vin_idx ON carfax_requests (vin);

COMMIT;
