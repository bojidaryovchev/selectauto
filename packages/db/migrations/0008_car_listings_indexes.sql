-- 0008_car_listings_indexes.sql
-- Indexes for the car_listings read model. Created AFTER the one-time backfill
-- so the bulk load isn't index-maintained row by row.
--
-- Each composite leads with a filter column and ends in `sort_id DESC`, so the
-- listing query (filter + keyset + ORDER BY sort_id DESC LIMIT n) walks the index
-- in output order and stops at LIMIT — flat cost at any page depth, no seq scan,
-- no cross-table work. Multi-filter combos use one composite for the leading
-- equality column and filter the rest in-scan (or BitmapAnd) — we deliberately
-- do NOT pre-build every combination.
--
-- NOTE: not using CREATE INDEX CONCURRENTLY — nothing reads car_listings yet (the
-- web page ships last), so a brief build-time lock on this table is harmless, and
-- CONCURRENTLY cannot run inside the migrate runner's statement batching anyway.
-- IF NOT EXISTS keeps re-runs safe. drive_wheel (3 values) / transmission (2) are
-- too low-selectivity to index — they filter in-scan.

CREATE INDEX IF NOT EXISTS cl_sort             ON car_listings (sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_brand_sort       ON car_listings (manufacturer_id, sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_brand_model_sort ON car_listings (manufacturer_id, model_id, sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_buynow_sort      ON car_listings (buy_now, sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_year_sort        ON car_listings (car_year, sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_color_sort       ON car_listings (car_color, sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_country_sort     ON car_listings (location_country, sort_id DESC);
CREATE INDEX IF NOT EXISTS cl_price_sort       ON car_listings (effective_price, sort_id DESC)
  WHERE effective_price > 0;
CREATE INDEX IF NOT EXISTS cl_lotnumber        ON car_listings (lot_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS cl_vin              ON car_listings (vin);

ANALYZE car_listings;
