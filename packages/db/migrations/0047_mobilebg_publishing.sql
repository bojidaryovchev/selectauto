-- 0047_mobilebg_publishing.sql
-- mobile.bg advert publishing: publish a catalog car to mobile.bg from the back
-- office, then edit/delete it there.
--
-- ADDITIVE ONLY. Three new tables, no existing table touched, no projection
-- rewritten, no recompute body changed. Safe to deploy ahead of the reading code
-- (and that is the required order — the runner never auto-applies on deploy, so
-- code SELECTing a column the DB lacks is a production 500).
--
-- ── Why the brand/model maps exist at all ────────────────────────────────────
-- mobile.bg publishes into a CLOSED vocabulary: `marka` must be one of their 208
-- brand strings and `model` one of that brand's own list (Ford → 66 entries),
-- both served by their public /dictionary endpoint. Our names come from
-- AuctionsAPI and do NOT match by string: they write `VW` (not Volkswagen),
-- `KGM` (not SsangYong), `Mg`, `Land Rover`, and models like `F150`,
-- `Crown victoria`, `C-max`.
--
-- Fuzzy-matching this at publish time is the wrong trade. A wrong `model` does
-- not error — mobile.bg accepts it and the advert lands in a filter bucket no
-- buyer browsing that model will ever see, silently, after we have already paid
-- for the advert. So the mapping is DATA an admin confirms once per brand/model,
-- and `map-car.ts` refuses to build a payload without it.
--
-- ── Why keyed on the EXTERNAL ids ────────────────────────────────────────────
-- `manufacturer_external_id` / `model_external_id`, not our local serial PKs.
-- Every reference join in this schema already goes through the external ids
-- (see the comment on `cars.manufacturer_id`), and the daily reference sync can
-- rewrite `manufacturers.name` / `vehicle_models.name` without touching a lot —
-- so a name-keyed map would silently detach. No FK: the reference tables are
-- rebuilt by the sync, and a mapping must survive a row being re-inserted.

BEGIN;

-- ── 1. Brand map ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobilebg_brand_map (
  manufacturer_external_id bigint      PRIMARY KEY,
  marka                    text        NOT NULL,
  verified_by              text        REFERENCES users (id) ON DELETE SET NULL,
  verified_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mobilebg_brand_map_marka_chk CHECK (btrim(marka) <> '')
);

COMMENT ON TABLE mobilebg_brand_map IS
  'Our manufacturer external id → the exact mobile.bg `marka` string. Confirmed by an admin against their live /dictionary list; never inferred. A car whose brand is unmapped cannot be published.';

-- ── 2. Model map ─────────────────────────────────────────────────────────────
-- `marka` is carried here as well, not just on the brand map: mobile.bg's model
-- list is SCOPED to a brand (/dictionary/1/1/model/?marka=Ford), so a model
-- string is meaningless without the brand it was picked under. Storing it makes
-- the row self-validating and lets the publish path read one table.
CREATE TABLE IF NOT EXISTS mobilebg_model_map (
  model_external_id        bigint      PRIMARY KEY,
  manufacturer_external_id bigint      NOT NULL,
  marka                    text        NOT NULL,
  model                    text        NOT NULL,
  verified_by              text        REFERENCES users (id) ON DELETE SET NULL,
  verified_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mobilebg_model_map_model_chk CHECK (btrim(model) <> '')
);

COMMENT ON TABLE mobilebg_model_map IS
  'Our model external id → the exact mobile.bg (marka, model) pair. `marka` is denormalised because their model vocabulary is brand-scoped, so a model string alone is ambiguous.';

CREATE INDEX IF NOT EXISTS mobilebg_model_map_manufacturer_idx
  ON mobilebg_model_map (manufacturer_external_id);

-- ── 3. The adverts ledger ────────────────────────────────────────────────────
-- One row per car we have ever ATTEMPTED to publish — the row is written before
-- the API call and updated with the outcome, so a failure leaves a diagnosable
-- record instead of vanishing. `car_id` is the PK: mobile.bg bills per advert
-- and a duplicate advert for the same car is a real cost, so the DB refuses one
-- structurally rather than trusting the UI not to double-submit.
CREATE TABLE IF NOT EXISTS mobilebg_adverts (
  car_id         integer     PRIMARY KEY REFERENCES cars (id) ON DELETE CASCADE,

  -- mobile.bg's advert id ("21234567890123456"). NULL until the first successful
  -- publish; its presence is what turns the next publish into an EDIT.
  ida            text,

  status         text        NOT NULL DEFAULT 'pending',

  -- What we actually advertised, kept for the audit trail: the landed price in
  -- EUR and the markup % that produced it. The calculator config can change
  -- afterwards; this must not.
  price_eur      numeric(14, 2),
  markup_pct     numeric(6, 3),

  -- Hash of the exact param set last sent. Lets a re-publish skip an unchanged
  -- car instead of burning an API round trip, and makes "what changed?"
  -- answerable. Same idempotency discipline as the ingestion upserts.
  payload_hash   text,

  picture_count  integer     NOT NULL DEFAULT 0,
  last_error     text,
  published_at   timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text        REFERENCES users (id) ON DELETE SET NULL,

  CONSTRAINT mobilebg_adverts_status_chk
    CHECK (status IN ('pending', 'published', 'failed', 'deleted'))
);

COMMENT ON TABLE mobilebg_adverts IS
  'One row per car ever submitted to mobile.bg. Written BEFORE the API call and updated with the outcome, so failures stay diagnosable. PK on car_id because mobile.bg bills per advert — a duplicate is a real cost, refused structurally.';
COMMENT ON COLUMN mobilebg_adverts.ida IS
  'mobile.bg advert id. NULL until the first successful publish; once set, advertpub is called WITH it and becomes an edit rather than a new (billable) advert.';
COMMENT ON COLUMN mobilebg_adverts.payload_hash IS
  'Hash of the last successfully sent param set — lets a re-publish skip an unchanged car.';
COMMENT ON COLUMN mobilebg_adverts.status IS
  'pending (row created, call not confirmed) | published | failed (see last_error) | deleted (removed at mobile.bg; row kept as history).';

-- At most one live advert id, but many rows may sit at NULL (never published /
-- failed), which a plain UNIQUE would also allow — the partial form states the
-- intent and stays small.
CREATE UNIQUE INDEX IF NOT EXISTS mobilebg_adverts_ida_ux
  ON mobilebg_adverts (ida)
  WHERE ida IS NOT NULL;

-- The admin list: published first, newest first.
CREATE INDEX IF NOT EXISTS mobilebg_adverts_status_updated_idx
  ON mobilebg_adverts (status, updated_at DESC);

COMMIT;
