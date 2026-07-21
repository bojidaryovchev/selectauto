-- 0036_weak_filter_indexes.sql
-- Indexes for the WEAK-FILTER live-COUNT fallback in the web app's getCarsCount
-- (and the matching feed/aboveCount predicates). Migration 0016 gave the BROAD
-- page-tab views O(1) counts via car_listing_counts, but any narrow filter falls
-- back to a live COUNT(*) — and three filterable columns had no index at all, so
-- a weak-only selection (just Задвижване, just Състояние, or an auction-window
-- tab) re-ran the exact full-projection seq scan 0016 was built to kill:
--
--   EXPLAIN (ANALYZE, BUFFERS), 2026-07-21, 951k-row car_listings:
--     COUNT drive_wheel='all'          → Parallel Seq Scan, 1114ms, 79 760 buffers
--     COUNT condition='run_and_drives' → Parallel Seq Scan,  864ms
--     COUNT sale_date > now()          → Parallel Seq Scan,  673ms ("Насрочени")
--     COUNT the "Днес" window          → Parallel Seq Scan,  705ms
--
-- drive_wheel/condition get the standard (col, sort_id DESC) composite (0008
-- deliberately skipped them as low-selectivity — true for the FEED, which rides
-- cl_sort, but the COUNT always pays full price; same lesson as 0021's fuel_type).
-- The composite also serves deep keyset pages for rare values, like its siblings.
--
-- sale_date gets a PARTIAL index (only ~16% of active rows carry a date — the
-- dated US/CA Copart+IAAI lots): the window predicates are ranges on sale_date,
-- so counts become small index-only range scans. It also rescues the "Днес" feed's
-- worst case: the window is legitimately empty on US evenings/weekends, and an
-- empty result under LIMIT means the cl_sort walk exhausts the ENTIRE index
-- finding nothing — with this index the planner can prove emptiness instantly.
-- Active table only: the auction-window filter never applies to the archived view
-- (its dates are all past — see car-listing-conditions.ts).
--
-- Plain CREATE INDEX (brief build lock), matching 0008/0011/0015/0021 — the
-- migration runner wraps each file in one implicit tx, so CONCURRENTLY (which
-- can't run in a tx) is not used. IF NOT EXISTS keeps re-runs safe.

CREATE INDEX IF NOT EXISTS cl_drive_sort      ON car_listings          (drive_wheel, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_drive_sort     ON car_listings_archived (drive_wheel, sort_id DESC);

CREATE INDEX IF NOT EXISTS cl_condition_sort  ON car_listings          (condition, sort_id DESC);
CREATE INDEX IF NOT EXISTS cla_condition_sort ON car_listings_archived (condition, sort_id DESC);

CREATE INDEX IF NOT EXISTS cl_saledate        ON car_listings          (sale_date)
  WHERE sale_date IS NOT NULL;

ANALYZE car_listings;
ANALYZE car_listings_archived;
