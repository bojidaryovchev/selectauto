-- 0021_fuel_type_indexes.sql
-- Keyset index for the new 'Гориво' (fuel_type) catalog filter added in 0020.
-- Mirrors every other filterable column: a (fuel_type, sort_id DESC) composite so
-- `WHERE fuel_type = $1 ORDER BY sort_id DESC` is an index range scan at any page
-- depth, not a parallel seq scan of the whole projection.
--
-- Without it, EXPLAIN showed a Parallel Seq Scan over car_listings (~79k buffer
-- reads / ~225ms, 311k rows filtered per worker) for a rare fuel value — the exact
-- full-scan the sibling (<col>, sort_id DESC) indexes (0008/0011/0015) exist to
-- avoid. Common fuels (gasoline) could ride cl_sort, but rare ones (hydrogen,
-- electric at deep pages) need this. One index per projection table.
--
-- Plain CREATE INDEX (brief build lock), matching 0008/0011/0015 — the migration
-- runner wraps each file in one implicit tx, so CONCURRENTLY (which can't run in a
-- tx) is not used here; the projections tolerate a short lock (see 0011 note).
-- IF NOT EXISTS keeps re-runs safe.

CREATE INDEX IF NOT EXISTS cl_fuel_sort  ON car_listings          (fuel_type, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_fuel_sort ON car_listings_archived (fuel_type, sort_id DESC);

ANALYZE car_listings;
ANALYZE car_listings_archived;
