-- 0005_inquiries.sql
-- "Безплатна консултация" leads submitted from the website inquiry modal
-- (the multi-step quiz in the old theme's footer). Keep in sync with the
-- `inquiries` table in schema.ts.
--
-- Website-write, low-volume lead data (not part of the AuctionsAPI ingestion),
-- so no raw_json column and no upsert/unique keys — every submission is a row.
-- Only name + phone are required; the quiz answers are optional because the
-- user can skip the brand/model branch.

BEGIN;

CREATE TABLE IF NOT EXISTS inquiries (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  specific_model  TEXT,
  brand           TEXT,
  model           TEXT,
  budget          TEXT,
  time            TEXT,
  finance         TEXT,
  page_url        TEXT,
  user_ip         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at);

COMMIT;
