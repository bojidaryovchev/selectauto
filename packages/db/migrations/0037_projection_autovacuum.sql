-- 0037_projection_autovacuum.sql
-- Aggressive per-table autovacuum for the two projection read models.
--
-- Why: the weekly/hourly recompute churn leaves the visibility map badly decayed
-- under DEFAULT autovacuum (scale factor 0.2 = ~190k dead tuples before a vacuum
-- triggers on the ~951k-row active table). Measured 2026-07-21: car_listings was
-- only 28.4% all-visible with 172k dead tuples; car_listings_archived 33.6%.
-- A decayed visibility map forces every index-assisted COUNT into heap
-- visibility checks — on Neon's cold storage that turned the auction-window
-- counts (partial cl_saledate index, migration 0036) into multi-second bitmap
-- heap scans instead of millisecond index-only scans. Index-only plans are the
-- whole point of counting on an index; they only work when relallvisible stays
-- high.
--
-- 0.02 scale factor + low thresholds ≈ vacuum after ~1% churn (~19k rows on the
-- active table), i.e. roughly every few hourly sync cycles — cheap, incremental,
-- and keeps the VM fresh. The insert factor matters for the archived table
-- (append-heavy: rows are INSERTed as lots conclude; inserts alone never trigger
-- default vacuum until 20%). ANALYZE tracks the same cadence so planner stats
-- follow the churn.
--
-- NOTE: this migration only changes settings. The initial catch-up VACUUM
-- ANALYZE is run manually (VACUUM cannot run inside a transaction block, and the
-- migration runner executes each file as one implicit transaction):
--   VACUUM (ANALYZE) car_listings; VACUUM (ANALYZE) car_listings_archived;

ALTER TABLE car_listings SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_vacuum_insert_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 1000
);

ALTER TABLE car_listings_archived SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_vacuum_insert_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 1000
);
