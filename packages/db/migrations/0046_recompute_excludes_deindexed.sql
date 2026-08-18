-- 0046_recompute_excludes_deindexed.sql
-- Make a paid de-index (migration 0043) actually REMOVE the car from the site,
-- not just kill its own URL.
--
-- ── Why this is done here and not in the web queries ────────────────────────
-- A de-indexed car has to disappear from: the catalog feed, the "Намерени: N"
-- count, every filter dropdown, the brand/model hubs, both hub sitemaps, the
-- per-car sitemap chunks, the homepage rails, /lyubimi, the daily favourites
-- digest email, the related-cars carousel, the catalog SEARCH box (which matches
-- on VIN — the one query a car's owner is most likely to run), and three country
-- landing pages.
--
-- Patching ~15 query files to add a predicate would be fragile — one missed
-- path silently re-exposes a car someone PAID to hide, and `searchPage` already
-- bypasses the shared condition builder, so the shared builder alone would not
-- have been enough. Worse, several of those surfaces do not read the projections
-- at all: the displayed count, the dropdowns and the HUB SITEMAPS read the
-- car_listing_counts / car_listing_facets summary tables.
--
-- Removing the car from the PROJECTIONS instead fixes every one of them at once,
-- and — because the recompute runs inside the `_counted` wrappers, which take a
-- before/after snapshot under an advisory lock — the summary tables get an exact
-- delta rather than drifting. (That is also why a hand-written
-- `DELETE FROM car_listings` must never be used: it produces no delta and
-- nothing reconciles the summaries on a timer.)
--
-- The `_counted` wrappers call these inner functions, so they need no change.
--
-- ── Behaviour ──────────────────────────────────────────────────────────────
-- FORWARD-APPLYING: because ingestion recomputes every touched car, a car whose
-- VIN is de-indexed stays out of the projections on every future sync too — a
-- re-ingested vehicle never quietly reappears in the catalog.
--
-- REVERSIBLE: clearing cars.deindexed_at and recomputing puts the row back.
--
-- Only two clauses changed in each function: the INSERT's source WHERE, and the
-- DELETE's predicate. Everything else is copied verbatim from 0035.

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
  -- CHANGED (0046): a paid de-index keeps the car out of the projection.
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

  -- CHANGED (0046): also remove a row that is already there when the car becomes
  -- de-indexed. Without this the INSERT guard alone would only stop FUTURE rows.
  DELETE FROM car_listings cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=false AND al.image_url IS NOT NULL)
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
    -- CHANGED (0046): a paid de-index keeps the car out of the past view too —
    -- otherwise a de-listed car stays browsable at ?status=past.
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
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=true AND al.image_url IS NOT NULL AND al.status IN ('sold','not_sold','failed'))
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
      -- CHANGED (0046)
      OR EXISTS (SELECT 1 FROM cars c WHERE c.id = cl.car_id AND c.deindexed_at IS NOT NULL)
    );
END;
$$;

COMMIT;
