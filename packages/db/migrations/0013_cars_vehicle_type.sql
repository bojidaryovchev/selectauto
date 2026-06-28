-- 0013_cars_vehicle_type.sql
-- Add `vehicle_type` to cars (the API's top-level category: automobile, truck,
-- motorcycle, boat, atv, bus, trailers, jet_sky, …). We already store `body_type`
-- (the car sub-shape: suv/sedan/pickup/…); vehicle_type is what lets us surface
-- non-car categories like boats. The value is already in cars.raw_json (the full
-- /api/cars car object), so existing rows are backfilled from raw_json by
-- `backfill-vehicle-type.mjs` (no API calls); new rows are populated by
-- normalize.ts going forward.

BEGIN;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

COMMIT;
