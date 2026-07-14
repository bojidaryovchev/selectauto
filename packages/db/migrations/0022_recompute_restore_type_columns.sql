-- 0022_recompute_restore_type_columns.sql
-- FIX a silent regression introduced by 0020_listing_fuel_type.sql.
--
-- 0020 redefined recompute_car_listings / recompute_archived_car_listings from
-- their OLD 0009/0010 bodies + fuel_type. Because every recompute definition is a
-- CREATE OR REPLACE applied in lexical order, basing 0020 on 0009/0010 (which
-- predate 0012 and 0014) SILENTLY REVERTED two later additions:
--
--   1. 0014 added vehicle_type + body_type to BOTH projections' INSERT / SELECT /
--      ON CONFLICT SET (powers the "Тип" facet + type filter). 0020 dropped them.
--      Effect: any car that gets INSERTed into car_listings/_archived after 0020
--      (a new car, or one that dropped out and returned) lands with
--      vehicle_type = NULL / body_type = NULL, so it is invisible to the "Тип"
--      dropdown (listing_facet_keys only emits vtype/btype for non-null values)
--      and to type filters. Rows taking the UPDATE (ON CONFLICT) path kept their
--      prior values (the columns were simply absent from the SET list), so it is a
--      slow decay for new/returning cars, not a wipe.
--
--   2. 0012 restricted the archived projection to CONCLUDED lots
--      (status IN ('sold','not_sold','failed')) in both the `chosen` CTE and the
--      DELETE pruning clause. 0020 dropped that filter, letting non-concluded
--      archived lots re-enter car_listings_archived — the exact churn 0012 fixed.
--
-- This migration redefines both functions as the UNION of 0014 (vehicle_type,
-- body_type, engine, archived concluded-only filter) + 0020 (fuel_type). It is the
-- 0014 body with fuel_type folded into the INSERT column list, the SELECT, and the
-- ON CONFLICT SET (matching 0020's placement, right after `engine`).
--
-- The facet machinery (listing_facet_keys / listing_facet_snapshot, redefined with
-- the 'fuel' dimension in 0020) is UNCHANGED and correct — it reads cl.vehicle_type
-- / cl.body_type / cl.fuel_type from the projection, so once these functions
-- re-populate those columns the "Тип" and "Гориво" facets track them automatically.
--
-- ── Post-migration re-populate (REQUIRED) ──
-- Like 0014/0020, this is function-only: a single joined UPDATE over the whole
-- ~935k-active + ~400k-past projection exceeds the pooled endpoint's statement
-- limit. After applying, run the chunked, resumable backfill (which calls the
-- *_counted wrappers, so counts + facets are repaired in the same pass) for BOTH
-- tables:
--   node --env-file-if-exists=../../.env backfill-car-listings.mjs
--   node --env-file-if-exists=../../.env backfill-car-listings.mjs --fn=recompute_archived_car_listings
-- The archived run also prunes the non-concluded rows 0020 wrongly admitted (via
-- the restored concluded-only DELETE clause). Alternatively let the weekly drift
-- sweep do it, but a manual backfill fixes the catalog immediately.

BEGIN;

-- ── active recompute (0014 body + fuel_type) ─────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH chosen AS (
    SELECT DISTINCT ON (al.car_id)
      al.car_id, al.id AS lot_id, al.buy_now, al.domain_name, al.location_country,
      al.lot_number, al.image_url, al.odometer_km, al.sale_date, al.status,
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
    sort_id, title, engine, fuel_type, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    c.vehicle_type, c.body_type, ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.buy_now_price,0), NULLIF(ch.final_bid,0), NULLIF(ch.bid_price,0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now()
  FROM chosen ch JOIN cars c ON c.id = ch.car_id
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id=EXCLUDED.lot_id, manufacturer_id=EXCLUDED.manufacturer_id, model_id=EXCLUDED.model_id,
    car_year=EXCLUDED.car_year, car_color=EXCLUDED.car_color, drive_wheel=EXCLUDED.drive_wheel,
    vehicle_type=EXCLUDED.vehicle_type, body_type=EXCLUDED.body_type,
    buy_now=EXCLUDED.buy_now, domain_name=EXCLUDED.domain_name, location_country=EXCLUDED.location_country,
    lot_number=EXCLUDED.lot_number, vin=EXCLUDED.vin, effective_price=EXCLUDED.effective_price,
    sort_id=EXCLUDED.sort_id, title=EXCLUDED.title, engine=EXCLUDED.engine, fuel_type=EXCLUDED.fuel_type,
    image_url=EXCLUDED.image_url, odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date,
    status=EXCLUDED.status, condition=EXCLUDED.condition, damage_main=EXCLUDED.damage_main,
    seller=EXCLUDED.seller, transmission=EXCLUDED.transmission, buy_now_price=EXCLUDED.buy_now_price,
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now();

  DELETE FROM car_listings cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=false AND al.image_url IS NOT NULL);
END;
$$;

-- ── archived recompute (0014 body + fuel_type; concluded-only filter restored) ─
CREATE OR REPLACE FUNCTION recompute_archived_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH chosen AS (
    SELECT DISTINCT ON (al.car_id)
      al.car_id, al.id AS lot_id, al.buy_now, al.domain_name, al.location_country,
      al.lot_number, al.image_url, al.odometer_km, al.sale_date, al.status,
      al.condition, al.damage_main, al.seller, al.buy_now_price, al.bid_price, al.final_bid
    FROM auction_lots al
    WHERE al.car_id = ANY(p_car_ids) AND al.archived = true AND al.image_url IS NOT NULL
      AND al.status IN ('sold','not_sold','failed')
    ORDER BY al.car_id, (al.status='sold') DESC, al.sale_date DESC NULLS LAST, al.id DESC
  )
  INSERT INTO car_listings_archived (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    vehicle_type, body_type, buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, engine, fuel_type, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    c.vehicle_type, c.body_type, ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.final_bid,0), NULLIF(ch.buy_now_price,0), NULLIF(ch.bid_price,0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now()
  FROM chosen ch JOIN cars c ON c.id = ch.car_id
  WHERE NOT EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=ch.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id=EXCLUDED.lot_id, manufacturer_id=EXCLUDED.manufacturer_id, model_id=EXCLUDED.model_id,
    car_year=EXCLUDED.car_year, car_color=EXCLUDED.car_color, drive_wheel=EXCLUDED.drive_wheel,
    vehicle_type=EXCLUDED.vehicle_type, body_type=EXCLUDED.body_type,
    buy_now=EXCLUDED.buy_now, domain_name=EXCLUDED.domain_name, location_country=EXCLUDED.location_country,
    lot_number=EXCLUDED.lot_number, vin=EXCLUDED.vin, effective_price=EXCLUDED.effective_price,
    sort_id=EXCLUDED.sort_id, title=EXCLUDED.title, engine=EXCLUDED.engine, fuel_type=EXCLUDED.fuel_type,
    image_url=EXCLUDED.image_url, odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date,
    status=EXCLUDED.status, condition=EXCLUDED.condition, damage_main=EXCLUDED.damage_main,
    seller=EXCLUDED.seller, transmission=EXCLUDED.transmission, buy_now_price=EXCLUDED.buy_now_price,
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now();

  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=true AND al.image_url IS NOT NULL AND al.status IN ('sold','not_sold','failed'))
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
    );
END;
$$;

COMMIT;
