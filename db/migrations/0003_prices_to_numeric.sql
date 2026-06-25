-- 0003_prices_to_numeric.sql
-- Change auction_lots price columns from BIGINT to NUMERIC(14,4).
--
-- Why: AuctionsAPI sends FRACTIONAL prices (confirmed live: 15530.14, and even
-- 51928.1213), which a BIGINT column rejects with
-- "invalid input syntax for type bigint". NUMERIC stores exact decimals (unlike
-- float types, which would round money imprecisely). precision 14 / scale 4
-- covers any vehicle price without truncation.
--
-- BIGINT -> NUMERIC is a safe widening: every existing integer value is a valid
-- NUMERIC, so no data loss. Run AFTER 0001/0002 on databases created before this
-- change; fresh databases already get NUMERIC from the updated 0001_initial.sql.
--
-- If this errors with "canceling statement due to lock timeout", a writer (a
-- running sync) holds the table — clear it (see README "Migration is blocked")
-- and re-run.

BEGIN;

-- Fail fast if a writer holds the table (don't hang waiting for the lock)...
SET LOCAL lock_timeout = '5s';
-- ...but once we HAVE the lock, allow the full-table rewrite to run to
-- completion. Changing column TYPE rewrites every row, and on a large table
-- (~1M+ rows) that exceeds Neon's default statement_timeout, which killed an
-- earlier attempt with "canceling statement due to statement timeout" (57014).
-- 0 = no statement timeout for this migration only (LOCAL = this txn).
SET LOCAL statement_timeout = 0;

-- Combine the three rewrites into ONE ALTER TABLE so the table is rewritten
-- once, not three times.
ALTER TABLE auction_lots
  ALTER COLUMN bid_price     TYPE NUMERIC(14, 4),
  ALTER COLUMN buy_now_price TYPE NUMERIC(14, 4),
  ALTER COLUMN final_bid     TYPE NUMERIC(14, 4);

COMMIT;
