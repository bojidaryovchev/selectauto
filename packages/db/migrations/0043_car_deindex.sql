-- 0043_car_deindex.sql
-- Paid per-car DE-INDEXING: the schema half. Vehicle owners pay to have "their"
-- listing taken out of Google and off the site; an admin flips it from the back
-- office in one click.
--
-- ADDITIVE ONLY. Nothing here changes existing behaviour — no projection is
-- rewritten, no query plan changes, no recompute body is touched. Deploying this
-- ahead of the reading code is therefore safe (and is the required order: the
-- runner never auto-applies on deploy, so code that SELECTs a column the DB does
-- not have yet is a production 500).
--
-- ── Why the flag lives on `cars` ─────────────────────────────────────────────
-- NOT on car_listings / car_listings_archived. Both projections are rebuilt by
-- recompute_*(), whose ON CONFLICT is an explicit column whitelist (so an UPSERT
-- would preserve an extra column) — BUT whose trailing DELETE removes the row
-- outright whenever the car stops qualifying for that table (0035:95-97 and
-- :148-153). An active→archived→active round trip, or a lot merely losing its
-- image_url, would silently destroy a PAID flag. `cars` has no such delete:
-- packages/functions contains no DELETE against it, and the ingestion upserts
-- (shared/db.ts:270-296) name their columns explicitly, so `deindexed_at` is
-- never touched on either INSERT or UPDATE.
--
-- NOT auction_lots.archived either, tempting as it looks: that column is written
-- back from the upstream payload on every sync (LOT_ARCHIVED_EXPR, shared/db.ts
-- :213-215), so an upstream `archived:false` would un-hide a paid-for car.
--
-- ── Why requests are keyed on the NORMALIZED VIN, not car_id ─────────────────
-- cars.vin is a PLAIN, NON-UNIQUE, nullable index (cars_vin_idx) and ingestion
-- only trims the VIN, never upper-cases it (normalize.ts), while archived
-- payloads arrive lower-cased. One physical vehicle therefore owns SEVERAL
-- cars.id rows — a relist, or the same car run at Copart and then IAAI — each
-- with its own /avtomobil/{id} URL. The repo's own /api/lot-check already
-- assumes this (it resolves a VIN with `ORDER BY cars.id DESC LIMIT 1`).
--
-- A car_id-keyed suppression would hide ONE url and leave the siblings indexed —
-- precisely the failure a paying customer finds by googling their own VIN. So
-- the durable record is keyed on upper(btrim(vin)) and fans out to every
-- matching cars row; `cars.deindexed_at` is the denormalised result, kept on the
-- row so the per-request proxy check stays a single-column PK point lookup.

BEGIN;

-- ── 1. The hot-path flag ─────────────────────────────────────────────────────
-- Nullable with no default ⇒ metadata-only ALTER in PG11+: no table rewrite, no
-- long lock, instant on a ~1M-row table.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS deindexed_at timestamptz;

COMMENT ON COLUMN cars.deindexed_at IS
  'When this car was de-indexed by a PAID delisting request (NULL = normal). Set by the admin action for EVERY cars row sharing the request''s normalized VIN, and re-applied to newly ingested rows with a matching VIN. Read on the hot path by proxy.ts (410 Gone) — see apps/web/src/lib/sold-lot-gone.ts. Ingestion never writes this column (shared/db.ts upserts use explicit column lists), so it survives every sync.';

-- ── 2. The durable, auditable request record ─────────────────────────────────
-- This is what the business actually sells, so it carries the money and the
-- paper trail, not just a boolean. created_by/revoked_by are text FKs because
-- users.id is text (Auth.js), and ON DELETE SET NULL so deleting a staff account
-- never destroys the record of a paid service.
CREATE TABLE IF NOT EXISTS car_deindex_requests (
  id                serial PRIMARY KEY,
  vin_normalized    text        NOT NULL,
  requester_name    text,
  requester_contact text,
  proof_note        text,
  fee_amount        numeric(14, 2),
  fee_currency      text        NOT NULL DEFAULT 'EUR',
  paid_at           timestamptz,
  notes             text,
  created_by        text        REFERENCES users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  revoked_by        text        REFERENCES users (id) ON DELETE SET NULL,

  -- Enforce the normalisation invariant IN THE DATABASE. Every lookup is
  -- `upper(btrim(vin)) = vin_normalized`, so a row stored un-normalised would
  -- silently never match and the customer's car would stay indexed.
  CONSTRAINT car_deindex_requests_vin_normalized_chk
    CHECK (vin_normalized = upper(btrim(vin_normalized)) AND char_length(vin_normalized) >= 5)
);

COMMENT ON TABLE car_deindex_requests IS
  'One row per PAID de-listing request, keyed on the normalized VIN (upper(btrim(vin))) because one vehicle owns several cars.id rows. Revocation is soft (revoked_at) so the history of a paid service survives; the partial unique index allows at most one ACTIVE request per VIN while permitting re-requests later.';
COMMENT ON COLUMN car_deindex_requests.vin_normalized IS
  'upper(btrim(vin)) — matches cars_vin_normalized_idx (migration 0044). CHECK-enforced so an un-normalised value can never be stored.';
COMMENT ON COLUMN car_deindex_requests.proof_note IS
  'How ownership was evidenced (талон / договор / ID shown). Free text for now — the intake + document-storage flow is a separate decision; see docs/admin-mail-and-deindex-plan.md §4.1.';
COMMENT ON COLUMN car_deindex_requests.revoked_at IS
  'Soft un-deindex. NOTE: revoking here does NOT lift a Bing block (RemoveBlockedUrl must be called explicitly) and Google re-crawls on its own schedule.';

-- At most one ACTIVE request per VIN; revoked rows stay as history.
CREATE UNIQUE INDEX IF NOT EXISTS car_deindex_requests_active_vin_ux
  ON car_deindex_requests (vin_normalized)
  WHERE revoked_at IS NULL;

-- Full history for one VIN (admin detail view). Tiny table — cheap.
CREATE INDEX IF NOT EXISTS car_deindex_requests_vin_idx
  ON car_deindex_requests (vin_normalized);

-- ── 3. Finding the de-indexed cars ───────────────────────────────────────────
-- PARTIAL index: it covers only the handful of rows that are actually
-- de-indexed, so it builds instantly today and stays microscopic. The proxy's
-- own lookup does NOT need it (that is a cars_pkey point lookup); this exists for
-- the admin list, and for the re-apply sweep that stamps newly ingested rows.
CREATE INDEX IF NOT EXISTS cars_deindexed_at_idx
  ON cars (deindexed_at)
  WHERE deindexed_at IS NOT NULL;

COMMIT;
