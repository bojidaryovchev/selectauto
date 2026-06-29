-- 0017_listing_facets.sql
-- Precomputed FACET options for the catalog filter dropdowns (the values + counts
-- behind getCarFacets). Mirrors the car_listing_counts pattern (0016): a tiny
-- summary table maintained INCREMENTALLY by the same recompute path that maintains
-- car_listings / car_listings_archived, so the website reads dropdown options with
-- one ~40ms index scan instead of 8 GROUP-BY/DISTINCT full-projection passes
-- (measured ~2.2–3.4s wall via Promise.all — the 8 scans contend on one Neon
-- compute, so running them "in parallel" is slower than the slowest single scan).
--
-- ── Why ids + counts only (NOT brand/model NAMES) ──
-- Per docs/05 §5, brand/model NAMES are deliberately NOT denormalized onto the
-- projection: Flow 4 (reference sync) can RENAME a manufacturer/model WITHOUT
-- touching any lot, so a lot-recompute hook would never refresh a denormalized
-- name → permanent staleness. So this table stores only the dimension VALUES that
-- appear (ids for brand/model; raw strings for color/drive/condition/year/type)
-- and their counts; the app resolves brand/model ids → names at read time from the
-- small manufacturers / vehicle_models tables (the existing getCarBrands pattern,
-- ~75ms). Color/drive/condition/vehicle_type/body_type/year carry their own value
-- (the app maps those to BG labels client-side, never via the DB).
--
-- ── Why a snapshot-diff (same rationale as 0016) ──
-- A car can be recomputed many times (idempotent), change brand/color/year, move
-- between active⇄past, or drop out. A naive +1/-1 on insert would drift, and
-- re-aggregating a whole dimension per batch would reintroduce the seq scan we are
-- removing. So we DIFF: snapshot the batch cars' facet-key membership BEFORE the
-- recompute, run it, snapshot AFTER, and apply (after − before) to the counters,
-- all in one transaction. Re-running a batch yields before==after ⇒ zero delta ⇒
-- idempotent and order-independent, exactly like the recompute it wraps.
--
-- ── PgBouncer-safe (no temp tables) ──
-- The before/after snapshots are plpgsql JSONB key→count maps (jsonb_object_agg),
-- not temp tables, applied in one INSERT … ON CONFLICT — runs under Neon's pooled
-- (transaction-pooling) endpoint the ingestion Lambdas use, like 0016.
--
-- ── Dimension keys (what each projection row contributes to) ──
-- For a projection row in table_kind ('active' | 'past'), each row contributes one
-- key per facet dimension it has a non-null value for. Key = "dim\tval\tval2":
--   'brand'   + manufacturer_id            + ''             -- a brand that appears
--   'model'   + model_id                   + manufacturer_id-- a model, with its brand
--   'color'   + car_color                  + ''
--   'drive'   + drive_wheel                + ''
--   'condition' + condition                + ''
--   'year'    + car_year (1980..2027 only) + ''             -- junk years excluded
--   'vtype'   + vehicle_type               + ''
--   'btype'   + body_type                  + '' (only when vehicle_type='automobile')
-- val2 carries the parent brand id for 'model' (the dropdown is grouped by brand);
-- '' for every other dimension. The year clamp window MUST match get-car-facets.ts
-- (YEAR_MIN/YEAR_MAX = 1980/2027); bump both together if widened.

BEGIN;

-- ── Facet summary table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS car_listing_facets (
  table_kind TEXT   NOT NULL,             -- 'active' | 'past'
  dim        TEXT   NOT NULL,             -- 'brand'|'model'|'color'|'drive'|'condition'|'year'|'vtype'|'btype'
  val        TEXT   NOT NULL,             -- the facet value (id as text for brand/model; raw string otherwise)
  val2       TEXT   NOT NULL DEFAULT '',  -- parent brand id for 'model'; '' otherwise
  n          BIGINT NOT NULL DEFAULT 0,   -- exact count of projection rows in this facet bucket
  PRIMARY KEY (table_kind, dim, val, val2)
);

-- The website reads one table_kind ('active' or 'past') and slices by dim in the
-- app, so a (table_kind, dim) index makes each dropdown's read an index range scan.
CREATE INDEX IF NOT EXISTS car_listing_facets_kind_dim_idx
  ON car_listing_facets (table_kind, dim);

-- ── Year clamp window (must match get-car-facets.query.ts) ──
-- A junk-year guard so the 'year' facet never stores 0/206/1900/etc. Kept as a
-- single source here; the helper below references these literals inline (a SQL
-- IMMUTABLE function can't read GUCs), so if you bump them, bump the WHERE too.

-- ── Row → facet keys (immutable helper) ──────────────────────────────────────
-- Returns the (dim, val, val2) facet keys a single projection row contributes to.
-- Pure mapping, no table access. Mirrors exactly what getCarFacets selects:
--   brands  : manufacturer_id present
--   models  : model_id present (carries manufacturer_id as val2)
--   colors  : car_color present
--   drives  : drive_wheel present
--   cond    : condition present
--   years   : car_year in [1980,2027]
--   vtypes  : vehicle_type present
--   btypes  : body_type present AND vehicle_type='automobile'
CREATE OR REPLACE FUNCTION listing_facet_keys(
  p_manufacturer_id BIGINT,
  p_model_id        BIGINT,
  p_car_color       TEXT,
  p_drive_wheel     TEXT,
  p_condition       TEXT,
  p_car_year        INTEGER,
  p_vehicle_type    TEXT,
  p_body_type       TEXT
)
RETURNS TABLE (dim TEXT, val TEXT, val2 TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'brand'::text, p_manufacturer_id::text, ''::text
    WHERE p_manufacturer_id IS NOT NULL
  UNION ALL
  SELECT 'model', p_model_id::text, COALESCE(p_manufacturer_id::text, '')
    WHERE p_model_id IS NOT NULL
  UNION ALL
  SELECT 'color', p_car_color, ''
    WHERE p_car_color IS NOT NULL
  UNION ALL
  SELECT 'drive', p_drive_wheel, ''
    WHERE p_drive_wheel IS NOT NULL
  UNION ALL
  SELECT 'condition', p_condition, ''
    WHERE p_condition IS NOT NULL
  UNION ALL
  SELECT 'year', p_car_year::text, ''
    WHERE p_car_year BETWEEN 1980 AND 2027
  UNION ALL
  SELECT 'vtype', p_vehicle_type, ''
    WHERE p_vehicle_type IS NOT NULL
  UNION ALL
  SELECT 'btype', p_body_type, ''
    WHERE p_body_type IS NOT NULL AND p_vehicle_type = 'automobile'
$$;

-- ── Snapshot helper: batch cars' facet contribution as a JSONB map ────────────
-- Aggregates ONLY the batch's car-ids (bounded by the PK = car_id, an index lookup
-- over the batch, never a full scan) into {"dim\tval\tval2": count}. '{}'::jsonb
-- when the batch contributes nothing. STABLE; no temp tables. Mirrors 0016's
-- listing_count_snapshot, but over the 8 facet dimensions.
CREATE OR REPLACE FUNCTION listing_facet_snapshot(
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
      SELECT k.dim || E'\t' || k.val || E'\t' || k.val2 AS key, count(*)::bigint AS c
      FROM car_listings cl
      CROSS JOIN LATERAL listing_facet_keys(
        cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
        cl.condition, cl.car_year, cl.vehicle_type, cl.body_type) k
      WHERE cl.car_id = ANY(p_car_ids)
      GROUP BY 1
    ) s;
  ELSE
    SELECT COALESCE(jsonb_object_agg(key, c), '{}'::jsonb) INTO result
    FROM (
      SELECT k.dim || E'\t' || k.val || E'\t' || k.val2 AS key, count(*)::bigint AS c
      FROM car_listings_archived cl
      CROSS JOIN LATERAL listing_facet_keys(
        cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
        cl.condition, cl.car_year, cl.vehicle_type, cl.body_type) k
      WHERE cl.car_id = ANY(p_car_ids)
      GROUP BY 1
    ) s;
  END IF;
  RETURN result;
END;
$$;

-- ── Apply a (after − before) delta map to car_listing_facets ─────────────────
-- Diffs two JSONB key→count maps over the union of their keys and upserts the
-- non-zero deltas. Key is "dim\tval\tval2"; split it back out on the way in.
-- Mirrors 0016's apply_listing_count_delta with the extra val2 segment.
CREATE OR REPLACE FUNCTION apply_listing_facet_delta(
  p_table_kind TEXT,
  p_before     jsonb,
  p_after      jsonb
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
  SELECT
    p_table_kind,
    split_part(key, E'\t', 1),
    split_part(key, E'\t', 2),
    split_part(key, E'\t', 3),
    COALESCE((p_after ->> key)::bigint, 0) - COALESCE((p_before ->> key)::bigint, 0)
  FROM (
    SELECT jsonb_object_keys(p_before) AS key
    UNION
    SELECT jsonb_object_keys(p_after)  AS key
  ) keys
  WHERE COALESCE((p_after ->> key)::bigint, 0) - COALESCE((p_before ->> key)::bigint, 0) <> 0
  ON CONFLICT (table_kind, dim, val, val2) DO UPDATE
    SET n = car_listing_facets.n + EXCLUDED.n;
$$;

-- ── Fold the facet maintenance INTO the existing *_counted wrappers ───────────
-- 0016 defined recompute_*_counted as: snapshot counts → recompute → snapshot →
-- apply. We REDEFINE them (CREATE OR REPLACE) to ALSO snapshot/apply facets in the
-- SAME transaction. This means EVERY existing caller — the ingestion hooks
-- (shared/db.ts) and the backfill (which already calls the *_counted wrappers) —
-- now maintains car_listing_facets too, with NO code change at the call sites.
-- The bare recompute_car_listings / recompute_archived_car_listings (the
-- pick-strategy source of truth) stay UNTOUCHED.
CREATE OR REPLACE FUNCTION recompute_car_listings_counted(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count_before jsonb;
  v_count_after  jsonb;
  v_facet_before jsonb;
  v_facet_after  jsonb;
BEGIN
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  v_count_before := listing_count_snapshot('active', p_car_ids);
  v_facet_before := listing_facet_snapshot('active', p_car_ids);
  PERFORM recompute_car_listings(p_car_ids);
  v_count_after := listing_count_snapshot('active', p_car_ids);
  v_facet_after := listing_facet_snapshot('active', p_car_ids);
  PERFORM apply_listing_count_delta('active', v_count_before, v_count_after);
  PERFORM apply_listing_facet_delta('active', v_facet_before, v_facet_after);
END;
$$;

CREATE OR REPLACE FUNCTION recompute_archived_car_listings_counted(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count_before jsonb;
  v_count_after  jsonb;
  v_facet_before jsonb;
  v_facet_after  jsonb;
BEGIN
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  v_count_before := listing_count_snapshot('past', p_car_ids);
  v_facet_before := listing_facet_snapshot('past', p_car_ids);
  PERFORM recompute_archived_car_listings(p_car_ids);
  v_count_after := listing_count_snapshot('past', p_car_ids);
  v_facet_after := listing_facet_snapshot('past', p_car_ids);
  PERFORM apply_listing_count_delta('past', v_count_before, v_count_after);
  PERFORM apply_listing_facet_delta('past', v_facet_before, v_facet_after);
END;
$$;

-- ── Seed the facet table from the current projection state (one-time) ─────────
-- A single full aggregate over each projection (acceptable as a one-off migration
-- cost; the whole point is we never do this per request afterwards). TRUNCATE
-- first makes the migration safe to re-run. Mirrors 0016's seed.
TRUNCATE car_listing_facets;

INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
SELECT 'active', k.dim, k.val, k.val2, count(*)::bigint
FROM car_listings cl
CROSS JOIN LATERAL listing_facet_keys(
  cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
  cl.condition, cl.car_year, cl.vehicle_type, cl.body_type) k
GROUP BY k.dim, k.val, k.val2
ON CONFLICT (table_kind, dim, val, val2) DO UPDATE SET n = EXCLUDED.n;

INSERT INTO car_listing_facets (table_kind, dim, val, val2, n)
SELECT 'past', k.dim, k.val, k.val2, count(*)::bigint
FROM car_listings_archived cl
CROSS JOIN LATERAL listing_facet_keys(
  cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
  cl.condition, cl.car_year, cl.vehicle_type, cl.body_type) k
GROUP BY k.dim, k.val, k.val2
ON CONFLICT (table_kind, dim, val, val2) DO UPDATE SET n = EXCLUDED.n;

COMMIT;
