-- 0010_car_listings_archived.sql
-- Read model for the PAST / SOLD listings view (the "Приключили" toggle on
-- /vsichki-avtomobili). Sibling of car_listings, but for ARCHIVED lots — one row
-- per physical car whose lots have concluded (sold/archived), so users can browse
-- recent auction results for PRICE RESEARCH ("what did this model sell for").
--
-- Same shape + indexes as car_listings (the grid/mapper/filters are reused).
-- Maintained incrementally by the hourly /archived-lots sync via
-- recompute_archived_car_listings(car_ids[]). Browse view is noindex (thin/decaying
-- per-lot content); the indexable SEO play is a future model-level price-stats page.
--
-- Pick-strategy here = MOST RECENT result: a sold lot ranks first, then the
-- newest sale_date, then newest lot id (we want the latest known outcome).
--
-- Membership rule: archived = true AND image_url IS NOT NULL (showable), AND NOT
-- currently in the active set (a car with any active+img lot belongs in the ACTIVE
-- catalog, not here — so it never appears in both).

BEGIN;

CREATE TABLE IF NOT EXISTS car_listings_archived (
  car_id            INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  lot_id            INTEGER NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,

  manufacturer_id   BIGINT,
  model_id          BIGINT,
  car_year          INTEGER,
  car_color         TEXT,
  drive_wheel       TEXT,
  buy_now           BOOLEAN,
  domain_name       TEXT,
  location_country  TEXT,
  lot_number        TEXT,
  vin               TEXT,
  effective_price   NUMERIC(14,4),  -- final_bid preferred for sold (see fn)

  sort_id           INTEGER NOT NULL,

  title             TEXT,
  engine            TEXT,
  image_url         TEXT,
  odometer_km       BIGINT,
  sale_date         TIMESTAMPTZ,
  status            TEXT,           -- sold / not_sold / failed / archived state
  condition         TEXT,
  damage_main       TEXT,
  seller            TEXT,
  transmission      TEXT,
  buy_now_price     NUMERIC(14,4),
  bid_price         NUMERIC(14,4),
  final_bid         NUMERIC(14,4),

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
    -- For sold cars the realized price is final_bid; fall back to buy_now/bid.
    COALESCE(NULLIF(ch.final_bid, 0), NULLIF(ch.buy_now_price, 0), NULLIF(ch.bid_price, 0)),
    ch.lot_id, c.title, c.engine, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
    ch.damage_main, ch.seller, c.transmission, ch.buy_now_price, ch.bid_price, ch.final_bid, now()
  FROM chosen ch
  JOIN cars c ON c.id = ch.car_id
  -- Exclude cars that still have an ACTIVE listing — they belong in car_listings.
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

  -- Remove rows that no longer qualify (no archived+img lot, OR car became active again).
  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=true AND al.image_url IS NOT NULL)
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
    );
END;
$$;

COMMIT;
