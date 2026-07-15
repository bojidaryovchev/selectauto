-- 0028_calculator_offers.sql
-- Leads from the /kalkulator gated-offer flow (Calculator v2 — docs/13-seo-action-plan.md
-- Phase B). The visitor tunes the import-cost estimator, then submits name/phone/email to
-- receive the itemized breakdown as a branded email; the same submit persists the lead here.
--
-- Like carfax_requests and inquiries this is website-write, low-volume lead data — no
-- raw_json/upsert keys. `breakdown_json` snapshots the full itemized estimate EXACTLY as the
-- visitor saw it (inputs + line items + rates version), so the sales follow-up call can
-- reference the numbers the lead already has in their inbox.
--
--   market          — sourcing market the estimate was for ('kr' | 'us' | 'ca').
--   car_price_eur   — the car price input, EUR (integer — estimates, not accounting).
--   total_eur       — the estimate's bottom-line total, EUR.
--   breakdown_json  — { inputs: {…}, lines: [{label, amountEur}…], ratesVerifiedAt }.
--
-- Keep in sync with the `calculatorOffers` pgTable in packages/db/schema.ts.

CREATE TABLE IF NOT EXISTS calculator_offers (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  market        TEXT NOT NULL,
  car_price_eur INTEGER NOT NULL,
  total_eur     INTEGER NOT NULL,
  breakdown_json JSONB NOT NULL,
  page_url      TEXT,
  user_ip       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calculator_offers_created_at_idx ON calculator_offers (created_at);
