-- 0002_widen_integer_columns.sql
-- Widen INTEGER columns that can overflow to BIGINT.
--
-- Why: AuctionsAPI sometimes returns odometer values above the INTEGER max
-- (2,147,483,647) — e.g. garbage/sentinel readings like 2553571660 — which
-- caused "value out of range for type integer" failures on the auction_lots
-- insert. Also widen sync_runs.records_processed so a large/long-lived backfill
-- counter can't overflow.
--
-- ALTER ... TYPE BIGINT is a safe widening (no data loss; INTs fit in BIGINT).
-- Run AFTER 0001 on any database created before this change. Fresh databases
-- already get BIGINT from the updated 0001_initial.sql.

BEGIN;

-- Fail fast instead of hanging forever if another connection holds a lock on
-- the table (e.g. a leftover Lambda transaction or an active write). Without
-- this, the ALTER waits indefinitely AND blocks writers queued behind it.
-- If this errors with "canceling statement due to lock timeout", clear the
-- blocking connection (see README "Migration is blocked") and re-run.
SET LOCAL lock_timeout = '5s';

ALTER TABLE auction_lots
  ALTER COLUMN odometer_km TYPE BIGINT;

ALTER TABLE sync_runs
  ALTER COLUMN records_processed TYPE BIGINT;

COMMIT;
