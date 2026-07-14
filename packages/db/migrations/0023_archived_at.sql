-- 0023_archived_at.sql
-- Add a SET-ONCE `archived_at` timestamp to car_listings_archived so we can tell
-- how long ago a lot was archived — the age signal the SEO 410 policy needs
-- (see docs/11-web-seo-and-indexing.md §3). Sold/concluded lots are currently
-- `noindex, follow` on the detail page, which keeps them out of the index but
-- makes Google re-crawl each one forever just to re-see the tag; for lots archived
-- long ago a 410 Gone is the stronger, crawl-budget-cheaper signal. The web app's
-- proxy.ts uses `archived_at < now() - <window>` to decide when to 410.
--
-- ── Why a NEW column and not `updated_at` ──
-- `updated_at` is bumped to now() on EVERY recompute (the ON CONFLICT DO UPDATE),
-- so it tracks "last touched by ingestion", not "when archived" — verified: the
-- whole archived set's updated_at spans only ~2 weeks with zero rows older than 3
-- months. `archived_at` is written once on first INSERT and PRESERVED on conflict.
--
-- ── Ordering note (why 0023, and why it re-defines the fn) ──
-- This MUST run AFTER 0022_recompute_restore_type_columns.sql, which restored
-- vehicle_type/body_type + the concluded-only filter that 0020 dropped. Every
-- recompute definition is a CREATE OR REPLACE applied in lexical order, so this
-- file redefines recompute_archived_car_listings as **0022's corrected body PLUS
-- archived_at stamping** — rebasing on 0022 (not 0020) so we inherit its fix
-- instead of reverting it. Only the archived fn changes here; the active fn
-- (recompute_car_listings) from 0022 is left as-is.
--
-- ── Source: auction_lots.archived_at (the upstream signal) ──
-- auction_lots already carries a per-lot `archived_at` (fully populated). We
-- project the CHOSEN lot's archived_at onto the projection — a truer "when
-- archived" than stamping now() at recompute time, and it survives a
-- delete+reinsert of the projection row. Preserved on conflict all the same
-- (COALESCE existing first) so it never drifts. NB: today that column's values
-- span only ~3 weeks (recently populated), so in practice NOTHING is old enough to
-- 410 yet — the correct, safe outcome; lots start 410ing only as they genuinely
-- age past the proxy's window from now.
--
-- ── Backfill ──
-- Existing projection rows: seed archived_at from the chosen lot's archived_at
-- where available, else updated_at as a lower bound. A single UPDATE over ~400k
-- rows is cheap and runs inline. `WHERE archived_at IS NULL` makes it idempotent.

BEGIN;

-- ── 1) Add the column (idempotent) ───────────────────────────────────────────
ALTER TABLE car_listings_archived ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ── 2) Backfill existing rows (idempotent) ────────────────────────────────────
-- Prefer the chosen lot's archived_at; fall back to updated_at where the lot has
-- none. Mirrors the recompute's pick (DISTINCT ON car_id, concluded, most recent).
UPDATE car_listings_archived cla SET archived_at = COALESCE(
  (
    SELECT al.archived_at FROM auction_lots al
    WHERE al.car_id = cla.car_id AND al.archived = true AND al.image_url IS NOT NULL
      AND al.status IN ('sold','not_sold','failed')
    ORDER BY (al.status='sold') DESC, al.sale_date DESC NULLS LAST, al.id DESC
    LIMIT 1
  ),
  cla.updated_at
)
WHERE cla.archived_at IS NULL;

-- ── 3) Re-define the archived recompute: 0022's body + archived_at stamping ────
-- Byte-for-byte 0022_recompute_restore_type_columns.sql's archived fn, with:
--   • archived_at added to the INSERT column list + SELECT (now()) for new rows,
--   • ON CONFLICT sets archived_at = COALESCE(existing, EXCLUDED) so it's PRESERVED
--     across recomputes (updated_at still bumps; archived_at does not).
CREATE OR REPLACE FUNCTION recompute_archived_car_listings(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH chosen AS (
    SELECT DISTINCT ON (al.car_id)
      al.car_id, al.id AS lot_id, al.buy_now, al.domain_name, al.location_country,
      al.lot_number, al.image_url, al.odometer_km, al.sale_date, al.status,
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
    sort_id, title, engine, fuel_type, image_url, odometer_km, sale_date, status, condition,
    damage_main, seller, transmission, buy_now_price, bid_price, final_bid, updated_at, archived_at
  )
  SELECT
    ch.car_id, ch.lot_id, c.manufacturer_id, c.model_id, c.year, c.color, c.drive_wheel,
    c.vehicle_type, c.body_type, ch.buy_now, ch.domain_name, ch.location_country, ch.lot_number, c.vin,
    COALESCE(NULLIF(ch.final_bid,0), NULLIF(ch.buy_now_price,0), NULLIF(ch.bid_price,0)),
    ch.lot_id, c.title, c.engine, c.fuel_type, ch.image_url, ch.odometer_km, ch.sale_date, ch.status, ch.condition,
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
    image_url=EXCLUDED.image_url, odometer_km=EXCLUDED.odometer_km, sale_date=EXCLUDED.sale_date,
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

-- ── 4) Index for future "old archived" range scans (batch 410 sweep / GSC export).
CREATE INDEX IF NOT EXISTS cla_archived_at ON car_listings_archived (archived_at);

COMMIT;
