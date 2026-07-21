-- 0035_thumbnail_url.sql
-- Add baked card-thumbnail plumbing so the catalog grid can be served from our
-- own S3+CloudFront `unoptimized`, bypassing Vercel Image Optimization (which is
-- ~80% of the Vercel bill — every card view is a MISS/STALE billed as a
-- transformation + cache write). Auction photos are immutable once ingested, so
-- one WebP thumbnail per lot, baked once and cached `immutable`, removes the
-- grid from the optimizer entirely.
--
-- Columns:
--   • auction_lots.thumbnail_url         — CloudFront URL of the baked thumbnail (NULL until baked).
--   • auction_lots.thumbnail_source_url  — the image_url the current thumbnail was baked FROM.
--       This is the change-detection key. image_url is overwritten on EVERY sync
--       (shared/db.ts:266), so the bake worker must (re)bake only when the new
--       image_url differs from thumbnail_source_url — otherwise it would re-bake
--       an identical image forever. The ingestion upsert NULLs thumbnail_url when
--       the incoming image differs, so the card falls back to the FRESH raw image
--       (never a thumbnail of the OLD photo) until the worker re-bakes.
--   • car_listings.thumbnail_url / car_listings_archived.thumbnail_url — projected
--       from the chosen lot so the web read models (SELECT *) expose it directly.
--
-- ── Ordering note (why this re-defines the recompute fns) ──
-- Every recompute definition is a CREATE OR REPLACE applied in lexical order, so
-- this file MUST rebase on the latest bodies to avoid silently reverting later
-- fixes (cf. the 0020→0022 regression):
--   • recompute_car_listings          — 0022's body + thumbnail_url.
--   • recompute_archived_car_listings — 0023's body (0022 + archived_at) + thumbnail_url.
-- The *_counted wrappers (0016) just PERFORM these base fns, so they are
-- unchanged. thumbnail_url does not affect counts/facets.
--
-- ── Post-migration ──
-- The new projection column is NULL for existing rows until a recompute runs for
-- that car. Backfill both the thumbnails (enqueue via backfill-thumbnails.mjs →
-- bake worker fills auction_lots.thumbnail_url) and, to project them, either wait
-- for the next sync/drift sweep or run the chunked recompute backfill:
--   node --env-file-if-exists=../../.env backfill-car-listings.mjs
--   node --env-file-if-exists=../../.env backfill-car-listings.mjs --fn=recompute_archived_car_listings
-- (The bake worker also updates the projection rows directly for the lot it bakes,
-- so a full recompute backfill is optional — see bakeThumbnail/handler.ts.)

BEGIN;

-- ── 1) Columns (idempotent) ───────────────────────────────────────────────────
ALTER TABLE auction_lots        ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE auction_lots        ADD COLUMN IF NOT EXISTS thumbnail_source_url text;
ALTER TABLE car_listings        ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE car_listings_archived ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Lets the backfill enqueuer scan un-baked lots cheaply.
CREATE INDEX IF NOT EXISTS auction_lots_thumbnail_missing_idx
  ON auction_lots (id) WHERE thumbnail_url IS NULL AND image_url IS NOT NULL;

-- ── 2) active recompute (0022 body + thumbnail_url) ──────────────────────────
CREATE OR REPLACE FUNCTION recompute_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH chosen AS (
    SELECT DISTINCT ON (al.car_id)
      al.car_id, al.id AS lot_id, al.buy_now, al.domain_name, al.location_country,
      al.lot_number, al.image_url, al.thumbnail_url, al.odometer_km, al.sale_date, al.status,
      al.condition, al.damage_main, al.seller, al.buy_now_price, al.bid_price, al.final_bid
    FROM auction_lots al
    WHERE al.car_id = ANY(p_car_ids) AND al.archived = false AND al.image_url IS NOT NULL
    ORDER BY al.car_id,
      (al.status IN ('sale','upcoming','future','on_approval','new_auction')
       OR (al.buy_now = true AND al.buy_now_price > 0)) DESC,
      al.sale_date ASC NULLS LAST, al.id DESC
  )
  INSERT INTO car_listings (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    vehicle_type, body_type, buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, engine, fuel_type, image_url, thumbnail_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    c.vehicle_type, c.body_type, ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.buy_now_price,0), NULLIF(ch.final_bid,0), NULLIF(ch.bid_price,0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.thumbnail_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now()
  FROM chosen ch JOIN cars c ON c.id = ch.car_id
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id=EXCLUDED.lot_id, manufacturer_id=EXCLUDED.manufacturer_id, model_id=EXCLUDED.model_id,
    car_year=EXCLUDED.car_year, car_color=EXCLUDED.car_color, drive_wheel=EXCLUDED.drive_wheel,
    vehicle_type=EXCLUDED.vehicle_type, body_type=EXCLUDED.body_type,
    buy_now=EXCLUDED.buy_now, domain_name=EXCLUDED.domain_name, location_country=EXCLUDED.location_country,
    lot_number=EXCLUDED.lot_number, vin=EXCLUDED.vin, effective_price=EXCLUDED.effective_price,
    sort_id=EXCLUDED.sort_id, title=EXCLUDED.title, engine=EXCLUDED.engine, fuel_type=EXCLUDED.fuel_type,
    image_url=EXCLUDED.image_url, thumbnail_url=EXCLUDED.thumbnail_url, odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date,
    status=EXCLUDED.status, condition=EXCLUDED.condition, damage_main=EXCLUDED.damage_main,
    seller=EXCLUDED.seller, transmission=EXCLUDED.transmission, buy_now_price=EXCLUDED.buy_now_price,
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now();

  DELETE FROM car_listings cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=false AND al.image_url IS NOT NULL);
END;
$$;

-- ── 3) archived recompute (0023 body + thumbnail_url) ────────────────────────
-- 0023 body = 0022 + archived_at stamping/preservation. Only thumbnail_url added.
CREATE OR REPLACE FUNCTION recompute_archived_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH chosen AS (
    SELECT DISTINCT ON (al.car_id)
      al.car_id, al.id AS lot_id, al.buy_now, al.domain_name, al.location_country,
      al.lot_number, al.image_url, al.thumbnail_url, al.odometer_km, al.sale_date, al.status,
      al.condition, al.damage_main, al.seller, al.buy_now_price, al.bid_price, al.final_bid,
      al.archived_at
    FROM auction_lots al
    WHERE al.car_id = ANY(p_car_ids) AND al.archived = true AND al.image_url IS NOT NULL
      AND al.status IN ('sold','not_sold','failed')
    ORDER BY al.car_id, (al.status='sold') DESC, al.sale_date DESC NULLS LAST, al.id DESC
  )
  INSERT INTO car_listings_archived (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    vehicle_type, body_type, buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, engine, fuel_type, image_url, thumbnail_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at, archived_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    c.vehicle_type, c.body_type, ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.final_bid,0), NULLIF(ch.buy_now_price,0), NULLIF(ch.bid_price,0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.thumbnail_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now(),
    COALESCE(ch.archived_at, now())
  FROM chosen ch JOIN cars c ON c.id = ch.car_id
  WHERE NOT EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=ch.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id=EXCLUDED.lot_id, manufacturer_id=EXCLUDED.manufacturer_id, model_id=EXCLUDED.model_id,
    car_year=EXCLUDED.car_year, car_color=EXCLUDED.car_color, drive_wheel=EXCLUDED.drive_wheel,
    vehicle_type=EXCLUDED.vehicle_type, body_type=EXCLUDED.body_type,
    buy_now=EXCLUDED.buy_now, domain_name=EXCLUDED.domain_name, location_country=EXCLUDED.location_country,
    lot_number=EXCLUDED.lot_number, vin=EXCLUDED.vin, effective_price=EXCLUDED.effective_price,
    sort_id=EXCLUDED.sort_id, title=EXCLUDED.title, engine=EXCLUDED.engine, fuel_type=EXCLUDED.fuel_type,
    image_url=EXCLUDED.image_url, thumbnail_url=EXCLUDED.thumbnail_url, odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date,
    status=EXCLUDED.status, condition=EXCLUDED.condition, damage_main=EXCLUDED.damage_main,
    seller=EXCLUDED.seller, transmission=EXCLUDED.transmission, buy_now_price=EXCLUDED.buy_now_price,
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now(),
    -- Preserve the original archive time; only stamp if somehow still missing.
    archived_at=COALESCE(car_listings_archived.archived_at, EXCLUDED.archived_at);

  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=true AND al.image_url IS NOT NULL AND al.status IN ('sold','not_sold','failed'))
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
    );
END;
$$;

COMMIT;
