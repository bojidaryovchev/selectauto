-- 0015_type_count_indexes.sql
-- Support the "Тип" filter + exact result counts. The catalog now shows the real
-- count (not "1000+"), and the type filter can target a rare category (e.g.
-- boat ≈ 1.5k). Without a vehicle_type index, a COUNT/filter on a rare type did a
-- seq scan (~59k buffers). These composite indexes (lead column + sort_id DESC,
-- mirroring 0008/0011) make both the listing keyset AND the count index-driven.
--
-- body_type already filters in-scan acceptably for common values; vehicle_type is
-- the one that needs an index (used for non-car categories that are individually
-- rare). Partial on the active-set predicate is unnecessary here (the projection
-- table is already the active/past set).

CREATE INDEX IF NOT EXISTS cl_vehicletype_sort
  ON car_listings (vehicle_type, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_vehicletype_sort
  ON car_listings_archived (vehicle_type, sort_id DESC);

-- body_type, lead-column (for bt:* type filters + their counts)
CREATE INDEX IF NOT EXISTS cl_bodytype_sort
  ON car_listings (body_type, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_bodytype_sort
  ON car_listings_archived (body_type, sort_id DESC);

ANALYZE car_listings;
ANALYZE car_listings_archived;
