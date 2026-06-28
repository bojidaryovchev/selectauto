-- 0012_archived_concluded_only.sql
-- Tighten the past/sold read model to genuinely CONCLUDED auctions. The first
-- cut included every archived lot, but archived lots can carry non-result
-- statuses (upcoming/sale/future — withdrawn/relisted/churn), which made the
-- "Приключили" page-1 show mostly non-sold cars (sort_id orders by newest
-- ingested, and the newest archived lots skew non-sold).
--
-- Fix: a car qualifies for car_listings_archived only if its chosen archived lot
-- has a concluded status (sold / not_sold / failed). Redefine the function and
-- purge rows that no longer qualify. ~146k cars remain (vs ~161k).

BEGIN;

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
    WHERE al.car_id = ANY(p_car_ids)
      AND al.archived = true
      AND al.image_url IS NOT NULL
      AND al.status IN ('sold', 'not_sold', 'failed')   -- concluded results only
    ORDER BY
      al.car_id,
      (al.status = 'sold') DESC,        -- a confirmed sold result first
      al.sale_date DESC NULLS LAST,     -- most recent outcome
      al.id DESC
  )
  INSERT INTO car_listings_archived (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, engine, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.final_bid, 0), NULLIF(ch.buy_now_price, 0), NULLIF(ch.bid_price, 0)),
    ch.lot_id, c.title, c.engine, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now()
  FROM chosen ch
  JOIN cars c ON c.id = ch.car_id
  WHERE NOT EXISTS (
    SELECT 1 FROM auction_lots a2
    WHERE a2.car_id = ch.car_id AND a2.archived = false AND a2.image_url IS NOT NULL
  )
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id=EXCLUDED.lot_id, manufacturer_id=EXCLUDED.manufacturer_id, model_id=EXCLUDED.model_id,
    car_year=EXCLUDED.car_year, car_color=EXCLUDED.car_color, drive_wheel=EXCLUDED.drive_wheel,
    buy_now=EXCLUDED.buy_now, domain_name=EXCLUDED.domain_name, location_country=EXCLUDED.location_country,
    lot_number=EXCLUDED.lot_number, vin=EXCLUDED.vin, effective_price=EXCLUDED.effective_price,
    sort_id=EXCLUDED.sort_id, title=EXCLUDED.title, engine=EXCLUDED.engine, image_url=EXCLUDED.image_url,
    odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date, status=EXCLUDED.status,
    condition=EXCLUDED.condition, damage_main=EXCLUDED.damage_main, seller=EXCLUDED.seller,
    transmission=EXCLUDED.transmission, buy_now_price=EXCLUDED.buy_now_price, bid_price=EXCLUDED.bid_price,
    final_bid=EXCLUDED.final_bid, updated_at=now();

  -- Drop rows that no longer qualify: no concluded archived lot, OR the car has
  -- an active listing again.
  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      NOT EXISTS (
        SELECT 1 FROM auction_lots al
        WHERE al.car_id=cl.car_id AND al.archived=true AND al.image_url IS NOT NULL
          AND al.status IN ('sold','not_sold','failed')
      )
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
    );

  -- One-time within this migration's reach: also purge any existing rows in the
  -- batch whose stored status is non-concluded (left over from the first cut).
  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND cl.status NOT IN ('sold','not_sold','failed');
END;
$$;

COMMIT;
