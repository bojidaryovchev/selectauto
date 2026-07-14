-- 0026_serialize_summary_maintenance.sql
-- Make car_listing_counts / car_listing_facets CORRECT BY CONSTRUCTION — remove the
-- one remaining way they could drift, so no periodic reconciliation is ever needed.
--
-- ── The problem ──
-- The _counted wrappers maintain the summaries as n += (after − before), where
-- `before`/`after` are snapshots of the batch's contribution taken around the
-- recompute. That delta is only correct if nothing else changes those same cars
-- between our `before` read and our `after` read. Under READ COMMITTED that is NOT
-- guaranteed: if two recomputes of OVERLAPPING car_ids run concurrently (in
-- practice: a backfill or an off-cycle drift sweep overlapping the live hourly
-- sync), both can read the same `before`, then both apply a delta for the same
-- change → the counter double-counts / loses a count. Example — car X (brand 5)
-- going active→archived: T1 reads before{brand5:1}, removes X, applies −1 (→99,
-- correct) and commits; T2 read the SAME before{brand5:1} earlier, recomputes X
-- (already gone, no-op), and applies −1 AGAIN (→98, drift).
--
-- Normal ingestion is effectively serial (one Step-Functions page at a time,
-- ~1 req/sec, one hourly execution), so this only bites when a BULK op overlaps
-- ingestion — but that is exactly when reseed-summaries.mjs was silently papering
-- over it.
--
-- ── The fix ──
-- Serialize summary maintenance with a single TRANSACTION-SCOPED advisory lock,
-- acquired at the top of both _counted wrappers (before the first snapshot). This
-- makes the whole snapshot → recompute → snapshot → apply sequence atomic w.r.t.
-- any other maintenance, so the delta is always exact and the summaries can never
-- drift from the projections.
--   • Cost: ~zero. During normal (serial) ingestion the lock is uncontended; it
--     only forces a brief wait when a bulk op genuinely overlaps live ingestion —
--     precisely the case we want serialized. The efficient set-based snapshot-diff
--     is unchanged (no per-row triggers).
--   • PgBouncer-safe: pg_advisory_xact_lock is tied to the transaction and released
--     at commit (unlike session-level advisory locks, which would leak across the
--     pooled endpoint the ingestion Lambdas use).
--   • Deadlock-free: one lock key, acquired once per transaction, taken BEFORE the
--     recompute's row locks, never nested — no lock-ordering inversion.
--   • Shared key across BOTH wrappers (they write the same summary tables), so a
--     concurrent active + archived maintenance also serialize. hashtext() gives a
--     stable, self-documenting key; this is the only advisory lock in the system.
--
-- Bodies are otherwise byte-identical to 0017's _counted wrappers (0020/0022/0023
-- only changed the BARE recompute_* fns + facet helpers, never these wrappers).
--
-- After this, reseed-summaries.mjs is only for a one-time repair after a DELIBERATE
-- recompute_* logic change (like 0022) + the --check diagnostic — never on a timer.

BEGIN;

CREATE OR REPLACE FUNCTION recompute_car_listings_counted(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count_before jsonb;
  v_count_after  jsonb;
  v_facet_before jsonb;
  v_facet_after  jsonb;
BEGIN
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  -- Serialize all summary maintenance (see header). Transaction-scoped, shared key.
  PERFORM pg_advisory_xact_lock(hashtext('car_listing_summary_maintenance'));
  v_count_before := listing_count_snapshot('active', p_car_ids);
  v_facet_before := listing_facet_snapshot('active', p_car_ids);
  PERFORM recompute_car_listings(p_car_ids);
  v_count_after := listing_count_snapshot('active', p_car_ids);
  v_facet_after := listing_facet_snapshot('active', p_car_ids);
  PERFORM apply_listing_count_delta('active', v_count_before, v_count_after);
  PERFORM apply_listing_facet_delta('active', v_facet_before, v_facet_after);
END;
$$;

CREATE OR REPLACE FUNCTION recompute_archived_car_listings_counted(p_car_ids integer[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count_before jsonb;
  v_count_after  jsonb;
  v_facet_before jsonb;
  v_facet_after  jsonb;
BEGIN
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  -- Same shared lock as the active wrapper — both write the same summary tables.
  PERFORM pg_advisory_xact_lock(hashtext('car_listing_summary_maintenance'));
  v_count_before := listing_count_snapshot('past', p_car_ids);
  v_facet_before := listing_facet_snapshot('past', p_car_ids);
  PERFORM recompute_archived_car_listings(p_car_ids);
  v_count_after := listing_count_snapshot('past', p_car_ids);
  v_facet_after := listing_facet_snapshot('past', p_car_ids);
  PERFORM apply_listing_count_delta('past', v_count_before, v_count_after);
  PERFORM apply_listing_facet_delta('past', v_facet_before, v_facet_after);
END;
$$;

COMMIT;
