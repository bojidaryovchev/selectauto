-- 0024_column_docs_and_checks.sql
-- Make the terse / generic / footgun columns SELF-DOCUMENTING in the database
-- itself (COMMENT ON COLUMN shows in \d+, drizzle-kit, and Studio) and pin the
-- small closed value sets with CHECK constraints — WITHOUT renaming anything.
--
-- Rationale: the summary tables (car_listing_counts / car_listing_facets) use a
-- deliberate generic EAV shape (table_kind/dim/val/val2/n) so one table serves every
-- broad count / filter dropdown; and cars/*_id hold EXTERNAL AuctionsAPI ids (not FKs)
-- to survive reference renames. Renaming these spans SQL DDL + plpgsql function
-- bodies + Drizzle + every web query all-at-once (high risk, low value). Documenting
-- them in-place is the low-risk win. CHECK value sets verified against live prod data
-- (2026-07-11): counts.dim {total,country,channel,country+channel}; facets.dim
-- {brand,model,color,drive,condition,year,vtype,btype,fuel}; table_kind {active,past};
-- sync_runs.flow_type = the full FlowType union (shared/types.ts), incl. the not-yet-
-- wired 'detail_refresh', so a future detail-refresh run can't trip the constraint.
--
-- Idempotent: COMMENTs are set-or-replace; CHECKs use DROP CONSTRAINT IF EXISTS + ADD.

BEGIN;

-- ── car_listing_counts (EAV summary) ─────────────────────────────────────────
COMMENT ON COLUMN car_listing_counts.table_kind IS
  'Which projection this count is for: ''active'' (car_listings) | ''past'' (car_listings_archived).';
COMMENT ON COLUMN car_listing_counts.dim IS
  'Broad count dimension: ''total'' | ''country'' | ''channel'' | ''country+channel'' (the composite market+channel key). Bucketed by listing_count_keys() (migration 0016).';
COMMENT ON COLUMN car_listing_counts.val IS
  'Dimension value: '''' for total; country ''USA''/''kr''/''Canada''; channel ''buy-now''/''auction''; composite ''<country>|<channel>'' e.g. ''USA|auction''.';
COMMENT ON COLUMN car_listing_counts.n IS
  'Exact precomputed row count for (table_kind,dim,val). getCarsCount reads this (O(1) PK lookup) for broad views instead of a full-table COUNT(*). Maintained by the recompute_*_counted snapshot-diff; can go stale only on a race/swallowed apply — repair with reseed-summaries.mjs.';

-- ── car_listing_facets (EAV summary) ─────────────────────────────────────────
COMMENT ON COLUMN car_listing_facets.table_kind IS
  'Which projection these facet options describe: ''active'' | ''past''. The site reads only ''active''.';
COMMENT ON COLUMN car_listing_facets.dim IS
  'Facet dimension: ''brand''|''model''|''color''|''drive''|''condition''|''year''|''vtype''|''btype''|''fuel'' (''fuel'' added by 0020). Bucketed by listing_facet_keys().';
COMMENT ON COLUMN car_listing_facets.val IS
  'Facet value: manufacturer/model EXTERNAL id as text for brand/model (resolved to a name at read time via *.external_id); raw string for color/drive/condition/year/vtype/btype/fuel.';
COMMENT ON COLUMN car_listing_facets.val2 IS
  'Parent brand EXTERNAL id for dim=''model'' (the dropdown groups models by brand); '''' for every other dimension. Part of the PK, so the '''' default is load-bearing.';
COMMENT ON COLUMN car_listing_facets.n IS
  'Exact count of projection rows in this facet bucket (surfaces as dropdown counts for fuel/condition/type). See car_listing_counts.n for the drift/repair note.';

-- ── cars: *_id columns hold EXTERNAL AuctionsAPI ids, NOT local FKs ───────────
COMMENT ON COLUMN cars.manufacturer_id IS
  'EXTERNAL AuctionsAPI manufacturer id. Join manufacturers.external_id — NOT manufacturers.id. (vehicle_models calls the same concept manufacturer_external_id.)';
COMMENT ON COLUMN cars.model_id IS
  'EXTERNAL AuctionsAPI model id. Join vehicle_models.external_id — NOT vehicle_models.id.';
COMMENT ON COLUMN cars.generation_id IS
  'EXTERNAL AuctionsAPI generation id. Join vehicle_generations.external_id — NOT vehicle_generations.id.';
COMMENT ON COLUMN cars.external_car_id IS
  'AuctionsAPI car id. UNIQUE, but the index treats NULLs as distinct (the "no external id" fallback path), so this is NOT a guaranteed dedupe key.';
COMMENT ON COLUMN cars.fuel_type IS
  'Upstream DRIVETRAIN tag, not a clean fuel enum: ''electric'' includes many HEV/PHEV and ''hybrid'' is a separate value — so it is NOT a reliable BEV-only filter. Denormalized onto both projections (0020).';

-- ── auction_lots: "domain" = auction source site ─────────────────────────────
COMMENT ON COLUMN auction_lots.domain_id IS
  'Auction SOURCE SITE id (1=IAAI, 3=Copart, 12=Encar), NOT a DNS host. Half of the (domain_id, lot_number) natural upsert key.';
COMMENT ON COLUMN auction_lots.domain_name IS
  'Auction source site name (copart/iaai/encar). Shown as the source badge; not the market tab.';
COMMENT ON COLUMN auction_lots.buy_now IS
  'DERIVED in normalize.ts (buy-now price > 0), not a raw API field. The app''s real "is buy-now" rule is buy_now=true AND effective_price>0.';
COMMENT ON COLUMN auction_lots.damage_main IS
  'Primary damage description from the upstream lot (there is no secondary-damage column).';

-- ── car_listings / car_listings_archived: denormalized + computed columns ─────
COMMENT ON COLUMN car_listings.manufacturer_id IS
  'EXTERNAL manufacturer id (denormalized from cars). Join manufacturers.external_id — NOT .id.';
COMMENT ON COLUMN car_listings.model_id IS
  'EXTERNAL model id (denormalized from cars). Join vehicle_models.external_id — NOT .id.';
COMMENT ON COLUMN car_listings.sort_id IS
  'The chosen lot''s id (= lot_id), reused as the newest-first keyset cursor AND the ORDER BY sort key (migrations 0008/0011/0015/0021 index it).';
COMMENT ON COLUMN car_listings.effective_price IS
  'Display price = COALESCE(NULLIF(buy_now_price,0), NULLIF(final_bid,0), NULLIF(bid_price,0)). Always NULL-or-positive (never 0), which is why the channel predicate can use price>0 == price IS NOT NULL.';
COMMENT ON COLUMN car_listings.domain_name IS
  'Auction SOURCE SITE name (copart/iaai/encar), not a DNS host and not the market tab.';
COMMENT ON COLUMN car_listings_archived.manufacturer_id IS
  'EXTERNAL manufacturer id (denormalized). Join manufacturers.external_id — NOT .id.';
COMMENT ON COLUMN car_listings_archived.model_id IS
  'EXTERNAL model id (denormalized). Join vehicle_models.external_id — NOT .id.';
COMMENT ON COLUMN car_listings_archived.sort_id IS
  'The chosen lot''s id (= lot_id), reused as the keyset cursor + sort key (same as car_listings.sort_id).';
COMMENT ON COLUMN car_listings_archived.effective_price IS
  'Display/realized price = COALESCE(NULLIF(final_bid,0), NULLIF(buy_now_price,0), NULLIF(bid_price,0)) — final_bid FIRST here (the sold price), unlike the active table.';

-- ── sync_runs: overloaded / catch-all columns ────────────────────────────────
COMMENT ON COLUMN sync_runs.flow_type IS
  'Which sync flow produced this run: full_backfill|hourly_cars|archived_lots|reference|detail_refresh|drift_sweep (shared/types.ts FlowType).';
COMMENT ON COLUMN sync_runs.last_page_processed IS
  'Checkpoint cursor, OVERLOADED per flow: page number (paginated cars/archived), manufacturers-processed index (reference), or cars.id keyset cursor (drift sweep).';
COMMENT ON COLUMN sync_runs.metadata_json IS
  'Per-run details blob; shape varies by flow (inspect the handler that created the run).';

-- ── CHECK constraints: pin the small closed value sets (verified vs live data) ─
ALTER TABLE car_listing_counts DROP CONSTRAINT IF EXISTS car_listing_counts_table_kind_chk;
ALTER TABLE car_listing_counts ADD  CONSTRAINT car_listing_counts_table_kind_chk
  CHECK (table_kind IN ('active','past'));
ALTER TABLE car_listing_counts DROP CONSTRAINT IF EXISTS car_listing_counts_dim_chk;
ALTER TABLE car_listing_counts ADD  CONSTRAINT car_listing_counts_dim_chk
  CHECK (dim IN ('total','country','channel','country+channel'));

ALTER TABLE car_listing_facets DROP CONSTRAINT IF EXISTS car_listing_facets_table_kind_chk;
ALTER TABLE car_listing_facets ADD  CONSTRAINT car_listing_facets_table_kind_chk
  CHECK (table_kind IN ('active','past'));
ALTER TABLE car_listing_facets DROP CONSTRAINT IF EXISTS car_listing_facets_dim_chk;
ALTER TABLE car_listing_facets ADD  CONSTRAINT car_listing_facets_dim_chk
  CHECK (dim IN ('brand','model','color','drive','condition','year','vtype','btype','fuel'));

ALTER TABLE sync_runs DROP CONSTRAINT IF EXISTS sync_runs_flow_type_chk;
ALTER TABLE sync_runs ADD  CONSTRAINT sync_runs_flow_type_chk
  CHECK (flow_type IN ('full_backfill','hourly_cars','archived_lots','reference','detail_refresh','drift_sweep'));

COMMIT;
