-- 0016_listing_counts.sql
-- Exact, O(1) result counts for the catalog's BROAD views (the page-level tabs:
-- market × channel × active/past). The website header shows "Намерени
-- автомобили: N"; computing that with COUNT(*) over car_listings is a full seq
-- scan (~750k rows for market=us → ~200ms warm, up to ~2s cold on a fresh Neon
-- compute), because no index can satisfy an unbounded COUNT. See ALL-CARS-DB-DESIGN.
--
-- Fix: a tiny summary table (car_listing_counts, a few dozen rows) holding the
-- count for each broad dimension key, maintained INCREMENTALLY by the same
-- recompute path that maintains car_listings / car_listings_archived. getCarsCount
-- reads this table for broad views; narrow views (brand/model/year/price/color/…)
-- still use a live COUNT (their filtered sets are small enough to scan quickly).
--
-- ── Why a snapshot-diff (not INSERT/DELETE triggers, not re-aggregation) ──
-- The projections are maintained set-based by recompute_*(car_ids[]): an UPSERT of
-- the batch's chosen lots + a DELETE of the batch's now-orphan rows. A car can be
-- recomputed many times (idempotent) and can change country / buy_now / move
-- between active⇄past / drop out entirely. A naive +1/-1 on insert would drift.
-- Re-aggregating a whole country per batch would reintroduce the seq scan we are
-- removing. So we DIFF: snapshot the batch cars' dimension membership BEFORE the
-- recompute, run it, snapshot AFTER, and apply (after − before) to the counters —
-- all in one transaction. Re-running a batch yields before==after ⇒ zero delta, so
-- it stays idempotent and order-independent, exactly like the recompute it wraps.
--
-- ── PgBouncer-safe (no temp tables) ──
-- Like recompute_*, these wrappers must run under Neon's pooled (transaction-
-- pooling) endpoint that the ingestion Lambdas use. So the before/after snapshots
-- are held in plpgsql JSONB variables (key→count maps via jsonb_object_agg), NOT
-- temp tables, and the delta is applied in one INSERT … ON CONFLICT.
--
-- ── Dimension keys (what each projection row contributes to) ──
-- For a row with (location_country, buy_now, effective_price) in table_kind
-- ('active' | 'past'), the "channel" is derived with the SAME predicate the app
-- uses: buy-now ⇔ (buy_now = true AND effective_price > 0); everything else is
-- auction. The key is "dim\tval" and each row contributes to:
--   'total'           + ''                       -- the unfiltered "Всички"
--   'country'         + e.g. 'USA'               -- market tab
--   'channel'         + 'buy-now' | 'auction'    -- buy-now toggle
--   'country+channel' + e.g. 'USA|auction'       -- market tab + buy-now toggle

BEGIN;

-- ── Counter table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS car_listing_counts (
  table_kind TEXT    NOT NULL,            -- 'active' | 'past'
  dim        TEXT    NOT NULL,            -- 'total' | 'country' | 'channel' | 'country+channel'
  val        TEXT    NOT NULL,            -- the dimension value ('' for total)
  n          BIGINT  NOT NULL DEFAULT 0,  -- exact count for this key
  PRIMARY KEY (table_kind, dim, val)
);

-- ── Row → dimension keys (immutable helper) ──────────────────────────────────
-- Returns the (dim, val) keys a single projection row contributes to. Pure
-- mapping, no table access. Channel mirrors the app predicate exactly.
CREATE OR REPLACE FUNCTION listing_count_keys(
  p_country TEXT,
  p_buy_now BOOLEAN,
  p_price   NUMERIC
)
RETURNS TABLE (dim TEXT, val TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
  WITH d AS (
    SELECT
      COALESCE(p_country, '') AS country,
      CASE WHEN p_buy_now = true AND p_price > 0 THEN 'buy-now' ELSE 'auction' END AS channel
  )
  SELECT 'total'::text, ''::text                         FROM d
  UNION ALL SELECT 'country',         d.country          FROM d
  UNION ALL SELECT 'channel',         d.channel          FROM d
  UNION ALL SELECT 'country+channel', d.country || '|' || d.channel FROM d
$$;

-- ── Snapshot helper: batch cars' contribution to each key, as a JSONB map ─────
-- Aggregates ONLY the batch's car-ids (bounded by the PK = car_id, an index
-- lookup over the batch, never a full scan) into {"dim\tval": count}. Returns
-- '{}'::jsonb when the batch contributes nothing. STABLE; no temp tables.
CREATE OR REPLACE FUNCTION listing_count_snapshot(
  p_table_kind TEXT,
  p_car_ids    integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_table_kind = 'active' THEN
    SELECT COALESCE(jsonb_object_agg(key, c), '{}'::jsonb) INTO result
    FROM (
      SELECT k.dim || E'\t' || k.val AS key, count(*)::bigint AS c
      FROM car_listings cl
      CROSS JOIN LATERAL listing_count_keys(cl.location_country, cl.buy_now, cl.effective_price) k
      WHERE cl.car_id = ANY(p_car_ids)
      GROUP BY 1
    ) s;
  ELSE
    SELECT COALESCE(jsonb_object_agg(key, c), '{}'::jsonb) INTO result
    FROM (
      SELECT k.dim || E'\t' || k.val AS key, count(*)::bigint AS c
      FROM car_listings_archived cl
      CROSS JOIN LATERAL listing_count_keys(cl.location_country, cl.buy_now, cl.effective_price) k
      WHERE cl.car_id = ANY(p_car_ids)
      GROUP BY 1
    ) s;
  END IF;
  RETURN result;
END;
$$;

-- ── Apply a (after − before) delta map to car_listing_counts ─────────────────
-- Diffs two JSONB key→count maps over the union of their keys and upserts the
-- non-zero deltas. The key is "dim\tval"; split it back out on the way in.
CREATE OR REPLACE FUNCTION apply_listing_count_delta(
  p_table_kind TEXT,
  p_before     jsonb,
  p_after      jsonb
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO car_listing_counts (table_kind, dim, val, n)
  SELECT
    p_table_kind,
    split_part(key, E'\t', 1),
    split_part(key, E'\t', 2),
    COALESCE((p_after ->> key)::bigint, 0) - COALESCE((p_before ->> key)::bigint, 0)
  FROM (
    SELECT jsonb_object_keys(p_before) AS key
    UNION
    SELECT jsonb_object_keys(p_after)  AS key
  ) keys
  WHERE COALESCE((p_after ->> key)::bigint, 0) - COALESCE((p_before ->> key)::bigint, 0) <> 0
  ON CONFLICT (table_kind, dim, val) DO UPDATE
    SET n = car_listing_counts.n + EXCLUDED.n;
$$;

-- ── The wrappers the ingestion + backfill call instead of recompute_* directly ─
-- Snapshot → recompute → snapshot → apply delta, all in this statement's
-- transaction. The two recompute_* functions stay untouched (pick-strategy SoT).
CREATE OR REPLACE FUNCTION recompute_car_listings_counted(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
BEGIN
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  v_before := listing_count_snapshot('active', p_car_ids);
  PERFORM recompute_car_listings(p_car_ids);
  v_after := listing_count_snapshot('active', p_car_ids);
  PERFORM apply_listing_count_delta('active', v_before, v_after);
END;
$$;

CREATE OR REPLACE FUNCTION recompute_archived_car_listings_counted(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
BEGIN
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  v_before := listing_count_snapshot('past', p_car_ids);
  PERFORM recompute_archived_car_listings(p_car_ids);
  v_after := listing_count_snapshot('past', p_car_ids);
  PERFORM apply_listing_count_delta('past', v_before, v_after);
END;
$$;

-- ── Seed the counter table from the current projection state (one-time) ───────
-- A single full aggregate over each projection (acceptable as a one-off migration
-- cost; the whole point is that we never do this per request afterwards). TRUNCATE
-- first makes the migration safe to re-run.
TRUNCATE car_listing_counts;

INSERT INTO car_listing_counts (table_kind, dim, val, n)
SELECT 'active', k.dim, k.val, count(*)::bigint
FROM car_listings cl
CROSS JOIN LATERAL listing_count_keys(cl.location_country, cl.buy_now, cl.effective_price) k
GROUP BY k.dim, k.val
ON CONFLICT (table_kind, dim, val) DO UPDATE SET n = EXCLUDED.n;

INSERT INTO car_listing_counts (table_kind, dim, val, n)
SELECT 'past', k.dim, k.val, count(*)::bigint
FROM car_listings_archived cl
CROSS JOIN LATERAL listing_count_keys(cl.location_country, cl.buy_now, cl.effective_price) k
GROUP BY k.dim, k.val
ON CONFLICT (table_kind, dim, val) DO UPDATE SET n = EXCLUDED.n;

COMMIT;
