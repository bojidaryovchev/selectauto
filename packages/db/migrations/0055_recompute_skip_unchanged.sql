-- 0055_recompute_skip_unchanged.sql
-- The projection recomputes stop rewriting rows that did not change.
--
-- ── Why ──────────────────────────────────────────────────────────────────────
-- recompute_car_listings / recompute_archived_car_listings (0052) upsert every
-- touched car with ON CONFLICT DO UPDATE SET <every column>, updated_at = now(),
-- with no condition — so a car whose projected values are all the same is still
-- rewritten: a new heap tuple, a dead one for vacuum, WAL, and (when the update
-- isn't HOT) an entry in each of the table's ~16 indexes. Measured on production
-- since the 4 Nov restart: 29.5 M updates on car_listings (970 k rows) and
-- 17.5 M on car_listings_archived (3 M rows, nearly all concluded and unchanging);
-- one hourly sync (26.11.2026 10:34) rewrote ~15 k car_listings rows. The weekly
-- drift sweep recomputes all ~4 M cars, which is the 2.7 CU hour every Sunday.
--
-- ── What changes ─────────────────────────────────────────────────────────────
-- Only the DO UPDATE gains a WHERE: the row is written when any projected column
-- differs (IS DISTINCT FROM, so NULL-safe). The column list is exactly the SET
-- list minus updated_at; for the archived table archived_at is compared with
-- the value the SET would give it (it is preserved once set). Everything else is
-- copied verbatim from 0052 — the source selection, the de-index rule and the
-- DELETEs.
--
-- Consequences:
--   - updated_at now means „last real change" rather than „last recompute". The
--     only reader is the unused listing-sitemap query (queries/sitemap), for
--     which that is the correct meaning.
--   - The _counted wrappers (0026) are unchanged: they diff the summary rows
--     before/after, which does not depend on whether a row was rewritten.
--   - A skipped row is still locked by ON CONFLICT for the transaction, as before.

BEGIN;

-- ── Active projection ───────────────────────────────────────────────────────
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
      -- (0052) a concluded lot is never live.
      AND (al.status IS NULL OR al.status NOT IN ('sold','not_sold','failed'))
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
  -- (0046) a paid de-index keeps the car out of the projection.
  WHERE c.deindexed_at IS NULL
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
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now()
  -- CHANGED (0055): write only when a projected column differs (the SET list minus updated_at).
  WHERE (car_listings.lot_id, car_listings.manufacturer_id, car_listings.model_id, car_listings.car_year,
         car_listings.car_color, car_listings.drive_wheel, car_listings.vehicle_type, car_listings.body_type,
         car_listings.buy_now, car_listings.domain_name, car_listings.location_country, car_listings.lot_number,
         car_listings.vin, car_listings.effective_price, car_listings.sort_id, car_listings.title, car_listings.engine,
         car_listings.fuel_type, car_listings.image_url, car_listings.thumbnail_url, car_listings.odometer_km,
         car_listings.sale_date, car_listings.status, car_listings.condition, car_listings.damage_main,
         car_listings.seller, car_listings.transmission, car_listings.buy_now_price, car_listings.bid_price,
         car_listings.final_bid)
    IS DISTINCT FROM
        (EXCLUDED.lot_id, EXCLUDED.manufacturer_id, EXCLUDED.model_id, EXCLUDED.car_year,
         EXCLUDED.car_color, EXCLUDED.drive_wheel, EXCLUDED.vehicle_type, EXCLUDED.body_type,
         EXCLUDED.buy_now, EXCLUDED.domain_name, EXCLUDED.location_country, EXCLUDED.lot_number,
         EXCLUDED.vin, EXCLUDED.effective_price, EXCLUDED.sort_id, EXCLUDED.title, EXCLUDED.engine,
         EXCLUDED.fuel_type, EXCLUDED.image_url, EXCLUDED.thumbnail_url, EXCLUDED.odometer_km,
         EXCLUDED.sale_date, EXCLUDED.status, EXCLUDED.condition, EXCLUDED.damage_main,
         EXCLUDED.seller, EXCLUDED.transmission, EXCLUDED.buy_now_price, EXCLUDED.bid_price,
         EXCLUDED.final_bid);

  -- (0046) also remove a row that is already there when the car becomes de-indexed.
  DELETE FROM car_listings cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      -- (0052) the car keeps its row only while it has a live lot.
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=false AND al.image_url IS NOT NULL
                    AND (al.status IS NULL OR al.status NOT IN ('sold','not_sold','failed')))
      OR EXISTS (SELECT 1 FROM cars c WHERE c.id = cl.car_id AND c.deindexed_at IS NOT NULL)
    );
END;
$$;

-- ── Archived projection ─────────────────────────────────────────────────────
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
    -- (0052) a concluded lot counts with or without the archive flag.
    WHERE al.car_id = ANY(p_car_ids) AND al.image_url IS NOT NULL
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
  -- (0052) past only while the car has no live lot.
  WHERE NOT EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=ch.car_id AND a2.archived=false AND a2.image_url IS NOT NULL
                      AND (a2.status IS NULL OR a2.status NOT IN ('sold','not_sold','failed')))
    -- (0046) a paid de-index keeps the car out of the past view too.
    AND c.deindexed_at IS NULL
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
    archived_at=COALESCE(car_listings_archived.archived_at, EXCLUDED.archived_at)
  -- CHANGED (0055): write only when a projected column differs (the SET list minus updated_at;
  -- archived_at against the value the SET would give it).
  WHERE (car_listings_archived.lot_id, car_listings_archived.manufacturer_id, car_listings_archived.model_id,
         car_listings_archived.car_year, car_listings_archived.car_color, car_listings_archived.drive_wheel,
         car_listings_archived.vehicle_type, car_listings_archived.body_type, car_listings_archived.buy_now,
         car_listings_archived.domain_name, car_listings_archived.location_country, car_listings_archived.lot_number,
         car_listings_archived.vin, car_listings_archived.effective_price, car_listings_archived.sort_id,
         car_listings_archived.title, car_listings_archived.engine, car_listings_archived.fuel_type,
         car_listings_archived.image_url, car_listings_archived.thumbnail_url, car_listings_archived.odometer_km,
         car_listings_archived.sale_date, car_listings_archived.status, car_listings_archived.condition,
         car_listings_archived.damage_main, car_listings_archived.seller, car_listings_archived.transmission,
         car_listings_archived.buy_now_price, car_listings_archived.bid_price, car_listings_archived.final_bid,
         car_listings_archived.archived_at)
    IS DISTINCT FROM
        (EXCLUDED.lot_id, EXCLUDED.manufacturer_id, EXCLUDED.model_id,
         EXCLUDED.car_year, EXCLUDED.car_color, EXCLUDED.drive_wheel,
         EXCLUDED.vehicle_type, EXCLUDED.body_type, EXCLUDED.buy_now,
         EXCLUDED.domain_name, EXCLUDED.location_country, EXCLUDED.lot_number,
         EXCLUDED.vin, EXCLUDED.effective_price, EXCLUDED.sort_id,
         EXCLUDED.title, EXCLUDED.engine, EXCLUDED.fuel_type,
         EXCLUDED.image_url, EXCLUDED.thumbnail_url, EXCLUDED.odometer_km,
         EXCLUDED.sale_date, EXCLUDED.status, EXCLUDED.condition,
         EXCLUDED.damage_main, EXCLUDED.seller, EXCLUDED.transmission,
         EXCLUDED.buy_now_price, EXCLUDED.bid_price, EXCLUDED.final_bid,
         COALESCE(car_listings_archived.archived_at, EXCLUDED.archived_at));

  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      -- (0052) the same two predicates as above.
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.image_url IS NOT NULL
                    AND al.status IN ('sold','not_sold','failed'))
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL
                   AND (a2.status IS NULL OR a2.status NOT IN ('sold','not_sold','failed')))
      -- (0046)
      OR EXISTS (SELECT 1 FROM cars c WHERE c.id = cl.car_id AND c.deindexed_at IS NOT NULL)
    );
END;
$$;

COMMIT;
