-- 0054_sold_price_stats.sql
-- Average realized sale price per make × model × year, precomputed — the market
-- benchmark on the car page („средна продажна цена") and the hub's „продадени по
-- години" table, read from here instead of being aggregated over
-- car_listings_archived on page views.
--
-- ADDITIVE ONLY: one new table and one function; nothing existing changes. Apply
-- it before the code that reads it ships (the runner never applies on deploy).
-- The web side refreshes it daily (/api/cron/refresh-sold-price-stats).
--
-- ── Why ──────────────────────────────────────────────────────────────────────
-- getModelYearSoldStat (every car-detail cache miss) and getModelSoldPricesByYear
-- (every model hub) aggregated the archived projection per request. Their
-- `"use cache"` lives in one serverless instance's memory, so it almost always
-- missed. Measured on production 26.11.2026:
--   - one car-page call, Hyundai Tucson 2019: BitmapAnd of 26,757 + 187,850
--     index entries, 8,514 heap pages, 9,445 buffers, 66 ms;
--   - one hub call, Hyundai Tucson: 24,775 rows on 24,773 heap pages,
--     24,959 buffers, 203 ms;
--   - car_listings_archived was 85 % of ALL block reads since the 4 Nov restart
--     (94 % in a quiet window); cla_year_sort + cla_brand_model_sort produced
--     222 of the 233 billion rows the whole database touched;
--   - the table (1.9 GB with those two indexes) stayed in Neon's working set,
--     which is what held the compute at 1.0–1.25 CU between ingestion runs.
-- The full rebuild below is one sequential pass: 0.88 s, 211,582 buffers,
-- 17,723 rows.
--
-- ── Semantics (identical to the queries it replaces) ────────────────────────
-- A row per (manufacturer_id, model_id, car_year) over archived lots with
-- effective_price > 0 and car_year between 1990 and 2027:
--   n          count(*)
--   avg_price  round(avg(effective_price))::int   (USD, as the projection stores it)
-- Rows with n < 3 are kept; the readers apply the „at least 3 sales" rule, as
-- before. Rows without a make or model are left out — nothing asks for them.

BEGIN;

CREATE TABLE IF NOT EXISTS sold_price_stats (
  manufacturer_id BIGINT      NOT NULL,
  model_id        BIGINT      NOT NULL,
  car_year        INTEGER     NOT NULL,
  n               INTEGER     NOT NULL,
  avg_price       INTEGER     NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (manufacturer_id, model_id, car_year)
);

COMMENT ON TABLE sold_price_stats IS
  'Average realized sale price per make × model × year over car_listings_archived (effective_price > 0, year 1990–2027). Rebuilt by refresh_sold_price_stats(); migration 0054.';

-- Rebuild from the archived projection. Writes only rows whose numbers changed and
-- deletes keys that no longer occur, so a daily run on an unchanged archive writes
-- nothing. Returns how many rows it wrote and deleted.
CREATE OR REPLACE FUNCTION refresh_sold_price_stats()
RETURNS TABLE (written BIGINT, deleted BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH fresh AS (
    SELECT a.manufacturer_id, a.model_id, a.car_year,
           count(*)::int AS n,
           round(avg(a.effective_price))::int AS avg_price
    FROM car_listings_archived a
    WHERE a.effective_price > 0
      AND a.car_year BETWEEN 1990 AND 2027
      AND a.manufacturer_id IS NOT NULL
      AND a.model_id IS NOT NULL
    GROUP BY a.manufacturer_id, a.model_id, a.car_year
  ),
  up AS (
    INSERT INTO sold_price_stats AS s (manufacturer_id, model_id, car_year, n, avg_price, updated_at)
    SELECT f.manufacturer_id, f.model_id, f.car_year, f.n, f.avg_price, now() FROM fresh f
    ON CONFLICT (manufacturer_id, model_id, car_year) DO UPDATE
      SET n = EXCLUDED.n, avg_price = EXCLUDED.avg_price, updated_at = now()
      WHERE (s.n, s.avg_price) IS DISTINCT FROM (EXCLUDED.n, EXCLUDED.avg_price)
    RETURNING 1
  ),
  del AS (
    DELETE FROM sold_price_stats s
    WHERE NOT EXISTS (
      SELECT 1 FROM fresh f
      WHERE f.manufacturer_id = s.manufacturer_id AND f.model_id = s.model_id AND f.car_year = s.car_year
    )
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM up), (SELECT count(*) FROM del);
END;
$$;

-- First fill.
SELECT * FROM refresh_sold_price_stats();

COMMIT;
