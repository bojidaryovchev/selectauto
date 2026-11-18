-- 0052_concluded_lots_leave_active.sql
-- A lot whose auction has concluded (status 'sold', 'not_sold' or 'failed') is no
-- longer offered as active, whether or not the archive signal ever arrived; it
-- shows in the past view instead.
--
-- ── Why ──────────────────────────────────────────────────────────────────────
-- Until now the active projection took every lot with `archived = false`,
-- whatever its status, and the past projection only lots with `archived = true`.
-- `archived` is set by one hourly event alone: the lot appearing in
-- /archived-lots?minutes=75. But /cars keeps sending a concluded lot for a while
-- (status 'sold', no `archived` key), and since 2026-10 a /cars lot without the
-- key is stored as active (03, „The archived handling" — that is what brings a
-- re-run lot back). Any /cars update after the archive event therefore
-- un-archived the lot for good, and so did every hour the archive feed missed
-- (the 46-hour outage of 12–14 Oct 2026, the thin week of 4–11 Oct). Measured on
-- 18.11.2026: 124 515 active listings were 'sold' (Copart 79 960, IAAI 44 555)
-- and 762 'not_sold', 12–17 thousand more each week, some sold in July — about
-- 11 % of the catalog showed cars that were gone.
--
-- The status is the truth: it arrives on every path (/cars, /archived-lots, the
-- detail refresh). So the projections now classify a lot by it:
--   live      = archived = false AND status not concluded (NULL counts as open)
--   concluded = status IN ('sold','not_sold','failed'), archived or not
-- A 'not_sold' lot that re-runs comes back from /cars with an open status and a
-- new sale date, and is live again — no archive flag needed either way.
--
-- Only the predicates changed; everything else is copied verbatim from 0046.
-- The `_counted` wrappers (0026) call these functions and need no change.
-- Apply, then recompute the affected cars through the `_counted` wrappers (they
-- keep car_listing_counts / car_listing_facets exact): the cars whose active row
-- is a concluded lot. Ingestion and the weekly drift sweep apply it from then on.

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
      -- CHANGED (0052): a concluded lot is never live.
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
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now();

  -- (0046) also remove a row that is already there when the car becomes de-indexed.
  DELETE FROM car_listings cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      -- CHANGED (0052): the car keeps its row only while it has a live lot.
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
    -- CHANGED (0052): a concluded lot counts with or without the archive flag.
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
  -- CHANGED (0052): past only while the car has no live lot.
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
    archived_at=COALESCE(car_listings_archived.archived_at, EXCLUDED.archived_at);

  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      -- CHANGED (0052): the same two predicates as above.
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
