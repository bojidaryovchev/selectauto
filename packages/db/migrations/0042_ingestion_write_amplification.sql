-- 0042_ingestion_write_amplification.sql
-- Storage/vacuum settings that cut the write amplification the hourly ingestion
-- generates. SETTINGS ONLY — no data is read or written by this migration, and
-- every statement is instantly reversible by setting the old value back.
--
-- ── What the numbers were (measured 2026-08-06, whole-database lifetime) ──
--   pg_stat_database: 394.7M tuples inserted / 241.9M updated / 376.1M deleted
--   of which the TOAST tables of cars + auction_lots alone accounted for
--   95.1% of ALL inserts and 97.7% of ALL deletes.
-- That is not row churn: it is Postgres re-TOASTing `raw_json` on every upsert.
-- The code-side fixes (normalize.ts stops duplicating the lots[] blob into
-- cars.raw_json; shared/db.ts skips byte-identical writes) remove the cause.
-- This migration handles the three things that live in table settings.

BEGIN;

-- ── 1. LZ4 instead of PGLZ for the two big JSONB columns ─────────────────────
-- Confirmed available on this instance: pg_settings.enumvals for
-- default_toast_compression is {pglz,lz4}; every currently-stored value is pglz.
-- LZ4 compresses several times faster than pglz at a comparable ratio, which is
-- pure CPU saving on the ingestion path (and on the detail page's read path).
--
-- SAFE: this affects only values written from now on. It does NOT rewrite the
-- table and does NOT invalidate existing data — each TOASTed datum records its
-- own algorithm, so pglz values stay readable forever. Reverting is
-- `SET COMPRESSION pglz`.
ALTER TABLE cars         ALTER COLUMN raw_json SET COMPRESSION lz4;
ALTER TABLE auction_lots ALTER COLUMN raw_json SET COMPRESSION lz4;

-- ── 2. Autovacuum for the ingestion tables ───────────────────────────────────
-- 0037 tuned ONLY the two projection tables. cars/auction_lots were left on the
-- defaults (scale factor 0.2 = ~382k dead tuples on cars before a vacuum even
-- triggers), which is why cars sat at 14.4% dead with its last autovacuum three
-- days old while its TOAST table carried 889k dead tuples across 9.9 GB.
--
-- The `toast.*` variants matter more than the heap ones here: the TOAST tables
-- are where the churn actually lands. After the raw_json backfill drops ~10 GB
-- of duplicated payload, these settings are what reclaims the space.
ALTER TABLE cars SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 5000,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 5000,
  toast.autovacuum_vacuum_scale_factor = 0.05,
  toast.autovacuum_vacuum_threshold = 5000
);

ALTER TABLE auction_lots SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 5000,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 5000,
  toast.autovacuum_vacuum_scale_factor = 0.05,
  toast.autovacuum_vacuum_threshold = 5000
);

-- ── 3. fillfactor: leave room on the page so UPDATEs can stay HOT ────────────
-- A HOT update writes NO index entries. car_listings was only 59.5% HOT
-- (71.4M updates, 42.5M HOT) — and it carries 1,349 MB of indexes over a 623 MB
-- heap, so every one of the 29M non-HOT updates wrote into ~16 indexes.
--
-- This is the RIGHT lever for that cost. The alternative — dropping the
-- "unused" indexes — was rejected: every one of them is reachable from the UI
-- (cl_lotnumber/cl_vin back the catalog search box, cars_vin_idx backs
-- /api/lot-check, each cl_*_sort backs a live catalog filter), so their low
-- idx_scan counts mean "rarely used", not "dead". fillfactor buys most of the
-- same write saving with zero read-latency risk.
--
-- SAFE + gradual: fillfactor applies to pages written from now on, so there is
-- no rewrite and no lock beyond the brief catalog update. Existing full pages
-- simply become HOT-friendly as vacuum frees space in them.
ALTER TABLE car_listings          SET (fillfactor = 85);
ALTER TABLE car_listings_archived SET (fillfactor = 90);
ALTER TABLE auction_lots          SET (fillfactor = 90);
ALTER TABLE cars                  SET (fillfactor = 90);

-- ── 4. Stop car_listing_counts from autovacuuming itself to death ────────────
-- 28 live rows, 516,099 updates, 5,260 autovacuum runs: with the default
-- threshold (50 + 0.2 x 28 ~= 56 dead tuples) every few recomputes trigger a
-- fresh vacuum of the same tiny table. It is already 100% HOT, so the fix is
-- purely to raise the trigger point — scanning a 28-row table with up to 1000
-- dead tuples is still instant. fillfactor gives the HOT chain room to keep
-- winning between vacuums.
ALTER TABLE car_listing_counts SET (
  fillfactor = 50,
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0,
  autovacuum_analyze_threshold = 1000
);

ALTER TABLE car_listing_facets SET (
  fillfactor = 70,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 1000
);

COMMIT;
