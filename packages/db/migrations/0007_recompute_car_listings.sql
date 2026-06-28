-- 0007_recompute_car_listings.sql
-- The single source of truth for maintaining car_listings: an idempotent,
-- set-based function that recomputes a BATCH of cars. Reused by (a) the one-time
-- backfill and (b) the two ingestion hooks (upsertCarsAndLots, archiveLots), so
-- the pick-strategy can never drift between them.
--
-- For each car_id in the batch it picks that car's best ACTIVE + image-bearing
-- lot (actionable-first: a lot with an active status — sale/upcoming/future/
-- on_approval/new_auction — or a valid buy-now ranks above ended/sold; then
-- soonest sale_date; then newest lot id), and upserts the car_listings row.
-- Any batch car that no longer has a usable lot is DELETED. Plain SQL only
-- (PgBouncer transaction-pooling safe). Verified at ~160ms for a 991-car page.
--
-- Idempotent and order-independent: it reads CURRENT state and writes the whole
-- row, so it is safe to over-call (e.g. on a Step Functions page retry).
-- CREATE OR REPLACE → re-running this migration just refreshes the definition.

BEGIN;

CREATE OR REPLACE FUNCTION recompute_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1) Upsert cars in the batch that have a usable (active + image) lot.
  WITH chosen AS (
    SELECT DISTINCT ON (al.car_id)
      al.car_id,
      al.id            AS lot_id,
      al.buy_now,
      al.domain_name,
      al.location_country,
      al.lot_number,
      al.image_url,
      al.odometer_km,
      al.sale_date,
      al.status,
      al.condition,
      al.damage_main,
      al.seller,
      al.buy_now_price,
      al.bid_price,
      al.final_bid
    FROM auction_lots al
    WHERE al.car_id = ANY(p_car_ids)
      AND al.archived = false
      AND al.image_url IS NOT NULL
    ORDER BY
      al.car_id,
      -- actionable-first: live/biddable or valid buy-now ranks above ended/sold
      (al.status IN ('sale','upcoming','future','on_approval','new_auction')
       OR (al.buy_now = true AND al.buy_now_price > 0)) DESC,
      al.sale_date ASC NULLS LAST,   -- soonest upcoming auction
      al.id DESC                     -- newest listing as the tiebreak
  )
  INSERT INTO car_listings (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.buy_now_price, 0), NULLIF(ch.final_bid, 0), NULLIF(ch.bid_price, 0)),
    ch.lot_id, c.title, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now()
  FROM chosen ch
  JOIN cars c ON c.id = ch.car_id
  ON CONFLICT (car_id) DO UPDATE SET
    lot_id           = EXCLUDED.lot_id,
    manufacturer_id  = EXCLUDED.manufacturer_id,
    model_id         = EXCLUDED.model_id,
    car_year         = EXCLUDED.car_year,
    car_color        = EXCLUDED.car_color,
    drive_wheel      = EXCLUDED.drive_wheel,
    buy_now          = EXCLUDED.buy_now,
    domain_name      = EXCLUDED.domain_name,
    location_country = EXCLUDED.location_country,
    lot_number       = EXCLUDED.lot_number,
    vin              = EXCLUDED.vin,
    effective_price  = EXCLUDED.effective_price,
    sort_id          = EXCLUDED.sort_id,
    title            = EXCLUDED.title,
    image_url        = EXCLUDED.image_url,
    odometer_km      = EXCLUDED.odometer_km,
    sale_date        = EXCLUDED.sale_date,
    status           = EXCLUDED.status,
    condition        = EXCLUDED.condition,
    damage_main      = EXCLUDED.damage_main,
    seller           = EXCLUDED.seller,
    transmission     = EXCLUDED.transmission,
    buy_now_price    = EXCLUDED.buy_now_price,
    bid_price        = EXCLUDED.bid_price,
    final_bid        = EXCLUDED.final_bid,
    updated_at       = now();

  -- 2) Delete rows for batch cars that no longer have any usable lot
  --    (e.g. their only active lot was just archived).
  DELETE FROM car_listings cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND NOT EXISTS (
      SELECT 1 FROM auction_lots al
      WHERE al.car_id = cl.car_id
        AND al.archived = false
        AND al.image_url IS NOT NULL
    );
END;
$$;

COMMIT;
