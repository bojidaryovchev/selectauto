-- 0011_car_listings_archived_indexes.sql
-- Indexes for the past/sold read model, mirroring car_listings (0008). Same
-- access pattern: filter + keyset on sort_id DESC. Created after the archived
-- backfill. IF NOT EXISTS keeps re-runs safe; the table isn't read by anything
-- yet (the toggle ships with the rest), so a brief build lock is harmless.

CREATE INDEX IF NOT EXISTS cla_sort             ON car_listings_archived (sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_brand_sort       ON car_listings_archived (manufacturer_id, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_brand_model_sort ON car_listings_archived (manufacturer_id, model_id, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_year_sort        ON car_listings_archived (car_year, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_color_sort       ON car_listings_archived (car_color, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_country_sort     ON car_listings_archived (location_country, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_price_sort       ON car_listings_archived (effective_price, sort_id DESC)
  WHERE effective_price > 0;
CREATE INDEX IF NOT EXISTS cla_lotnumber        ON car_listings_archived (lot_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS cla_vin              ON car_listings_archived (vin);

ANALYZE car_listings_archived;
