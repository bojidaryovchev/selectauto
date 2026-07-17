-- 0034_calculator_settings.sql
-- Admin-editable import-calculator config (fees, commission tiers, transport legs,
-- agency, technotest, duty/VAT/FX) stored as one JSON blob. One row per save —
-- the newest row is the active config; the calculator falls back to the built-in
-- DEFAULT_CALC_CONFIG (apps/web/src/data/import-rates.ts) when the table is empty.
--
-- Keep in sync with the `calculatorSettings` pgTable in packages/db/schema.ts.

CREATE TABLE IF NOT EXISTS calculator_settings (
  id         SERIAL PRIMARY KEY,
  config     JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
