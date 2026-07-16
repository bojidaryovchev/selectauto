-- 0032_vin_report_checks.sql
-- Read-through cache for the FREE AuctionsAPI `/reports/check-records/{vin}` lookup
-- (record availability: how many Carfax / AutoCheck records exist + the normalized
-- vehicle name). Backs the /proverka-vin tool AND the per-car "Провери история по VIN"
-- button on /avtomobil/[id].
--
-- Why a TABLE and not `"use cache"`: the lookup is triggered at REQUEST time (a user
-- click), never baked into a prerender, and the site runs on serverless where the
-- in-memory `"use cache"` LRU does not persist across instances/requests (see
-- apps/web/src/lib/cache-tags.ts). Only a durable store dedupes across users — which
-- is what protects the shared AuctionsAPI ~3 req/s budget (the same key the ingestion
-- pipeline uses). The endpoint is free (no report credit), so this saves budget, not
-- money.
--
-- One row per VIN (VIN is the natural PK — AuctionsAPI keys the lookup by VIN). The
-- record COUNTS drift upward slowly as history accrues, so entries are refreshed on a
-- TTL (see apps/web/src/lib/vin-report-cache.ts) via `checked_at`; the `vehicle` name
-- is effectively immutable. A stale row is also the fallback when the upstream call
-- fails.
--
--   vin        — normalized (trimmed, upper-cased) 17-char VIN. Primary key.
--   vehicle    — normalized vehicle description ("HONDA CR-V EX 2018"), or NULL.
--   carfax     — count of Carfax records (>= 0).
--   autocheck  — count of AutoCheck records (>= 0).
--   checked_at — when the upstream lookup that produced this row last ran (TTL clock).
--
-- Keep in sync with the `vinReportChecks` pgTable in packages/db/schema.ts.

CREATE TABLE IF NOT EXISTS vin_report_checks (
  vin        TEXT PRIMARY KEY,
  vehicle    TEXT,
  carfax     INTEGER NOT NULL DEFAULT 0,
  autocheck  INTEGER NOT NULL DEFAULT 0,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
