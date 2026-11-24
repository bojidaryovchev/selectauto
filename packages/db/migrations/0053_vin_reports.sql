-- 0053_vin_reports.sql
-- Carfax and AutoCheck reports bought through AuctionsAPI's reports API, the
-- back office's „Carfax отчети" (/admin/carfax-otcheti).
--
-- ADDITIVE ONLY: one new table, nothing existing changes. Apply it before the
-- code that reads it ships (the runner never applies on deploy).
--
-- ── What a row is ────────────────────────────────────────────────────────────
-- One report AuctionsAPI generated for our key, whoever asked for it:
--   origin 'admin'       — bought from the admin; ordered_by says who, and
--                          carfax_request_id the website lead it was for, if any;
--   origin 'auctionsapi' — bought outside the admin with the same key (the history
--                          doesn't say where), imported from GET /reports/my-history. 68
--                          reports were bought that way between 29.06 and
--                          23.11.2026, before this table existed.
-- external_id is AuctionsAPI's report id (`id` in the report and history
-- answers), UNIQUE, so the history import can never add a report twice.
--
-- ── Why a 'pending' row exists ───────────────────────────────────────────────
-- Every report is paid from AuctionsAPI's balance. The admin writes a 'pending'
-- claim BEFORE the paid call, and a partial UNIQUE index allows one claim per
-- VIN and provider, so two people pressing „Купете" at once (or one person
-- twice) cannot buy the same report twice. The call fills in the row
-- ('ready'). When the call ends without an answer (a timeout: a report with a
-- PDF takes 40–60 s), the claim stays 'pending' and the history import adopts
-- the report when it appears there. A claim older than 10 minutes may be taken
-- over by a new purchase (apps/web/src/mutations/vin-reports).
--
-- ── Columns ──────────────────────────────────────────────────────────────────
--   provider          'carfax' | 'autocheck' (the {type} of /reports/{type}/{vin}).
--   vin               upper(btrim(vin)), CHECK-enforced like car_deindex_requests,
--                     so it matches cars_vin_normalized_idx (0044) as stored.
--   html_url, pdf_url the report's files on AuctionsAPI's CDN, as returned.
--   verified_real     AuctionsAPI's `is_verified_real`, as returned (NULL on
--                     reports from before 30.08.2026, which predate the field).
--                     AuctionsAPI does not document it; the admin shows it
--                     verbatim and never decides anything from it.
--   balance_after_usd the balance AuctionsAPI reported after an admin purchase.
--   created_at        when the report was bought (AuctionsAPI's created_at for
--                     an imported one).
--
-- Keep in sync with the `vinReports` pgTable in packages/db/schema.ts.

BEGIN;

CREATE TABLE IF NOT EXISTS vin_reports (
  id                serial PRIMARY KEY,
  provider          text        NOT NULL,
  vin               text        NOT NULL,
  status            text        NOT NULL DEFAULT 'ready',
  external_id       integer     UNIQUE,
  html_url          text,
  pdf_url           text,
  verified_real     boolean,
  origin            text        NOT NULL,
  ordered_by        text        REFERENCES users (id) ON DELETE SET NULL,
  carfax_request_id integer     REFERENCES carfax_requests (id) ON DELETE SET NULL,
  balance_after_usd numeric(12, 2),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vin_reports_provider_chk CHECK (provider IN ('carfax', 'autocheck')),
  CONSTRAINT vin_reports_status_chk CHECK (status IN ('pending', 'ready')),
  CONSTRAINT vin_reports_origin_chk CHECK (origin IN ('admin', 'auctionsapi')),
  CONSTRAINT vin_reports_vin_chk CHECK (vin = upper(btrim(vin)) AND char_length(vin) = 17),
  -- A finished report always has its AuctionsAPI id.
  CONSTRAINT vin_reports_ready_chk CHECK (status = 'pending' OR external_id IS NOT NULL)
);

COMMENT ON TABLE vin_reports IS
  'Carfax/AutoCheck reports bought through AuctionsAPI with our key: from the admin (origin admin) or elsewhere and imported from /reports/my-history (origin auctionsapi). A pending row is the claim taken before the paid call. See migration 0053.';

-- One claim in flight per VIN and provider: the guard against paying twice.
CREATE UNIQUE INDEX IF NOT EXISTS vin_reports_pending_ux ON vin_reports (vin, provider) WHERE status = 'pending';

-- The admin's lookups: by VIN (the check, the lead drawer) and newest first (the list).
CREATE INDEX IF NOT EXISTS vin_reports_vin_idx ON vin_reports (vin);
CREATE INDEX IF NOT EXISTS vin_reports_created_at_idx ON vin_reports (created_at DESC, id DESC);

COMMIT;
