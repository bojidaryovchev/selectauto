-- 0020_listing_fuel_type.sql
-- Add the `fuel_type` filter column to BOTH catalog projections (car_listings +
-- car_listings_archived) and expose it as a new 'fuel' facet dimension, so the
-- catalog filter bar can offer a "Гориво" dropdown (Бензин / Дизел / Хибрид /
-- Електрически / Flex-fuel / Газ / Водород) served single-table with zero joins.
--
-- ── Why denormalize onto the projection (not join to cars at query time) ──
-- The /vsichki-avtomобили feed filters/sorts/paginates car_listings SINGLE-TABLE
-- (a GROUP BY / join over the ~1M-row set times out — see docs/05-projection-tables-car-listings.md
-- §4/§5). `fuel_type` lives on `cars` and is STABLE (the daily reference sync
-- doesn't touch it — same rationale as engine/title/transmission in 0009), so it
-- is safe to denormalize onto the projection, exactly like the other filter
-- columns. Coverage is high (~98% of active cars carry a value; verified).
--
-- ── Data note (why 'fuel' and not an "is EV" boolean) ──
-- The upstream `fuel` value is a DRIVETRAIN tag: 'electric' includes many HEV/PHEV
-- (e.g. Camry/Prius/RAV4 Hybrid also land under 'electric'), and hybrids are ALSO
-- present under a separate 'hybrid' value. Rather than guess BEV-vs-hybrid with
-- brittle title/engine heuristics, we expose the raw taxonomy as a facet and let
-- the user pick 'electric' and/or 'hybrid' themselves (labels in car-labels.ts).
--
-- Re-defines recompute_car_listings / recompute_archived_car_listings to populate
-- fuel_type, and folds a 'fuel' key into listing_facet_keys + listing_facet_snapshot
-- so car_listing_facets tracks it incrementally like every other dimension. A
-- follow-up backfill / the periodic drift sweep refreshes rows via the *_counted
-- wrappers. NB: this migration is function-only — it does NOT backfill existing rows
-- or re-seed the 'fuel' facet inline (see the transaction-boundary note below); that
-- runs separately via packages/db/backfill-fuel-type.mjs.

-- ── Transaction boundary note ──
-- This migration is intentionally DDL/function-only (fast, safe in one tx). It does
-- NOT backfill existing rows or re-seed the 'fuel' facet inline: those touch the
-- whole ~935k-active + ~400k-past projections and a single joined UPDATE over both
-- exceeds the pooled endpoint's transaction/statement limit (verified: the inline
-- version was canceled + rolled back). The backfill + facet seed run AFTER this
-- migration as a chunked, resumable keyset job — packages/db/backfill-fuel-type.mjs —
-- which mirrors how the drift sweep repairs the projection in car-id windows. Until
-- that job runs, fuel_type is NULL on pre-existing rows (the 'Гориво' dropdown just
-- shows nothing / the facet list is empty), and NEW ingestion already populates it
-- via the redefined recompute functions below.

BEGIN;

-- ── 1) Add the column to both projections ────────────────────────────────────
ALTER TABLE car_listings          ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE car_listings_archived ADD COLUMN IF NOT EXISTS fuel_type TEXT;

-- ── 2) Re-define recompute_car_listings to project fuel_type ──────────────────
-- Identical to 0009's definition, with fuel_type added to the INSERT column list,
-- the SELECT (c.fuel_type), and the ON CONFLICT update set.
CREATE OR REPLACE FUNCTION recompute_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
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
      (al.status IN ('sale','upcoming','future','on_approval','new_auction')
       OR (al.buy_now = true AND al.buy_now_price > 0)) DESC,
      al.sale_date ASC NULLS LAST,
      al.id DESC
  )
  INSERT INTO car_listings (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, engine, fuel_type, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.buy_now_price, 0), NULLIF(ch.final_bid, 0), NULLIF(ch.bid_price, 0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
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
    engine           = EXCLUDED.engine,
    fuel_type        = EXCLUDED.fuel_type,
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

-- ── 3) Re-define recompute_archived_car_listings to project fuel_type ─────────
-- Identical to 0010's definition, with fuel_type added (mirrors the engine col
-- the archived fn already projects).
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
      (al.status = 'sold') DESC,
      al.sale_date DESC NULLS LAST,
      al.id DESC
  )
  INSERT INTO car_listings_archived (
    car_id, lot_id, manufacturer_id, model_id, car_year, car_color, drive_wheel,
    buy_now, domain_name, location_country, lot_number, vin, effective_price,
    sort_id, title, engine, fuel_type, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.final_bid, 0), NULLIF(ch.buy_now_price, 0), NULLIF(ch.bid_price, 0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
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
    sort_id=EXCLUDED.sort_id, title=EXCLUDED.title, engine=EXCLUDED.engine, fuel_type=EXCLUDED.fuel_type,
    image_url=EXCLUDED.image_url, odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date,
    status=EXCLUDED.status, condition=EXCLUDED.condition, damage_main=EXCLUDED.damage_main,
    seller=EXCLUDED.seller, transmission=EXCLUDED.transmission, buy_now_price=EXCLUDED.buy_now_price,
    bid_price=EXCLUDED.bid_price, final_bid=EXCLUDED.final_bid, updated_at=now();

  DELETE FROM car_listings_archived cl
  WHERE cl.car_id = ANY(p_car_ids)
    AND (
      NOT EXISTS (SELECT 1 FROM auction_lots al WHERE al.car_id=cl.car_id AND al.archived=true AND al.image_url IS NOT NULL)
      OR EXISTS (SELECT 1 FROM auction_lots a2 WHERE a2.car_id=cl.car_id AND a2.archived=false AND a2.image_url IS NOT NULL)
    );
END;
$$;

-- ── 4) Add a 'fuel' key to the facet-keys helper ─────────────────────────────
-- Re-defines listing_facet_keys (0017) with an extra fuel parameter contributing
-- a 'fuel' dimension key when present. Column order of the existing params is
-- UNCHANGED and the new param is appended LAST, so we can DROP/CREATE (the return
-- type is unchanged, but the signature gains an argument → CREATE OR REPLACE would
-- error on the differing arg list; DROP first).
DROP FUNCTION IF EXISTS listing_facet_keys(BIGINT, BIGINT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION listing_facet_keys(
  p_manufacturer_id BIGINT,
  p_model_id        BIGINT,
  p_car_color       TEXT,
  p_drive_wheel     TEXT,
  p_condition       TEXT,
  p_car_year        INTEGER,
  p_vehicle_type    TEXT,
  p_body_type       TEXT,
  p_fuel_type       TEXT
)
RETURNS TABLE (dim TEXT, val TEXT, val2 TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'brand'::text, p_manufacturer_id::text, ''::text
    WHERE p_manufacturer_id IS NOT NULL
  UNION ALL
  SELECT 'model', p_model_id::text, COALESCE(p_manufacturer_id::text, '')
    WHERE p_model_id IS NOT NULL
  UNION ALL
  SELECT 'color', p_car_color, ''
    WHERE p_car_color IS NOT NULL
  UNION ALL
  SELECT 'drive', p_drive_wheel, ''
    WHERE p_drive_wheel IS NOT NULL
  UNION ALL
  SELECT 'condition', p_condition, ''
    WHERE p_condition IS NOT NULL
  UNION ALL
  SELECT 'year', p_car_year::text, ''
    WHERE p_car_year BETWEEN 1980 AND 2027
  UNION ALL
  SELECT 'vtype', p_vehicle_type, ''
    WHERE p_vehicle_type IS NOT NULL
  UNION ALL
  SELECT 'btype', p_body_type, ''
    WHERE p_body_type IS NOT NULL AND p_vehicle_type = 'automobile'
  UNION ALL
  SELECT 'fuel', p_fuel_type, ''
    WHERE p_fuel_type IS NOT NULL
$$;

-- ── 5) Re-define listing_facet_snapshot to pass fuel_type through ─────────────
-- Same as 0017's, but each CROSS JOIN LATERAL now also passes cl.fuel_type.
CREATE OR REPLACE FUNCTION listing_facet_snapshot(
  p_table_kind TEXT,
  p_car_ids    integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_table_kind = 'active' THEN
    SELECT COALESCE(jsonb_object_agg(key, c), '{}'::jsonb) INTO result
    FROM (
      SELECT k.dim || E'\t' || k.val || E'\t' || k.val2 AS key, count(*)::bigint AS c
      FROM car_listings cl
      CROSS JOIN LATERAL listing_facet_keys(
        cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
        cl.condition, cl.car_year, cl.vehicle_type, cl.body_type, cl.fuel_type) k
      WHERE cl.car_id = ANY(p_car_ids)
      GROUP BY 1
    ) s;
  ELSE
    SELECT COALESCE(jsonb_object_agg(key, c), '{}'::jsonb) INTO result
    FROM (
      SELECT k.dim || E'\t' || k.val || E'\t' || k.val2 AS key, count(*)::bigint AS c
      FROM car_listings_archived cl
      CROSS JOIN LATERAL listing_facet_keys(
        cl.manufacturer_id, cl.model_id, cl.car_color, cl.drive_wheel,
        cl.condition, cl.car_year, cl.vehicle_type, cl.body_type, cl.fuel_type) k
      WHERE cl.car_id = ANY(p_car_ids)
      GROUP BY 1
    ) s;
  END IF;
  RETURN result;
END;
$$;

-- NB: the recompute_*_counted wrappers (0016/0017) call listing_facet_snapshot by
-- name and are UNCHANGED — they now pick up the new 'fuel' dimension automatically,
-- so ingestion + the drift sweep keep car_listing_facets['fuel'] exact with no
-- further edits. The one-time backfill of pre-existing rows + the initial 'fuel'
-- facet seed are done by packages/db/backfill-fuel-type.mjs (run once after this
-- migration); see the transaction-boundary note at the top.

COMMIT;
