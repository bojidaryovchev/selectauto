import { neon } from "@neondatabase/serverless";
import { SOLD_LOT_410_AFTER } from "@/constants";

/**
 * Decide whether a `/avtomobil/{id}` request should return **410 Gone**. TWO
 * independent reasons:
 *
 *  1. **Paid de-index** — `cars.deindexed_at` is set, because a vehicle owner
 *     bought a delisting (migration 0043). Fires regardless of archive age, and
 *     regardless of whether the car is still active.
 *  2. **Long-dead sold lot** — archived at least `SOLD_LOT_410_AFTER` ago. The
 *     automatic index-hygiene rule (docs/11-web-seo-and-indexing.md §3).
 *
 * Used by `proxy.ts`, which is the ONLY place a real 410 can originate: the
 * detail page is PPR and streams a 200 shell, so `page.tsx` cannot set the status
 * (see docs/11 §3 and the note in `app/avtomobil/[id]/page.tsx`).
 *
 * Runs in the Next 16 proxy, which is the **Node.js runtime** (v16 made proxy
 * node-only and non-configurable — verified in the version-16 upgrade guide), so a
 * DB call here is fine despite the historical "edge-safe" note on the auth config.
 * Kept self-contained (its own `neon()` HTTP client) rather than importing the
 * app's Drizzle pool, matching proxy.md's "don't rely on shared modules" guidance.
 *
 * ── Why this is a SNAPSHOT and no longer a query per request ─────────────────
 * This runs on EVERY car-page request, and the site's traffic is ~99% crawlers
 * sweeping the ~945k-page long tail — so a per-id lookup here meant ~700k Neon
 * round trips a day, each holding a Fluid instance open (Vercel bills Provisioned
 * Memory during I/O even though Active CPU pauses) purely to be told "no".
 *
 * Both reasons are answerable from a tiny snapshot instead:
 *
 *  - Reason 1 is a SET, and a microscopic one — a paid delisting is a
 *    hand-sold service, so `cars.deindexed_at IS NOT NULL` covers a handful of
 *    rows and is served by the partial `cars_deindexed_at_idx`. We hold the whole
 *    id set in memory.
 *  - Reason 2 gets a GLOBAL SHORT-CIRCUIT rather than a set, because that set
 *    grows without bound (~20k rows/day archived) and pre-loading millions of ids
 *    per instance would cost more than the queries it replaces. Instead the
 *    snapshot carries one boolean: does ANY archived row exceed the threshold yet?
 *    While that is false, NO id can be 410 by reason 2 and the per-id query is
 *    skipped entirely. It is an indexed existence probe (`cla_archived_at`,
 *    migration 0023), not a scan.
 *
 * ⚠️ The reason-2 short-circuit expires with the calendar. Verified 2026-08-14:
 * 1,054,465 archived rows, ZERO over 90 days, oldest `archived_at` 2026-06-23 —
 * so the probe stays false, and this module makes zero per-request queries, until
 * roughly **2026-09-21**. After that the fallback below runs again for every car
 * page that isn't de-indexed. If crawler volume still matters then, the durable
 * fix is to materialise gone-ness into the data (the 410 date of an archived row
 * is `archived_at + 90 days`, known and immutable the moment it is archived)
 * rather than to re-derive it per request.
 *
 * Freshness: a paid de-index now takes effect within `SNAPSHOT_TTL_MS` rather than
 * on the very next request. 30s keeps "the customer can verify their URL is dead
 * while still on the phone" true, at 1 query per instance per 30s instead of one
 * per request.
 *
 * Fails **closed to `false`** (never 410) on any error or missing config — a DB
 * hiccup must never take down every live car page. NOTE the trade-off this
 * implies for reason 1: during a database outage a paid-for de-indexed car
 * becomes reachable again. Availability is deliberately preferred over the
 * suppression guarantee; the page-level `noindex` still applies, and the window
 * is bounded by the outage.
 */

let sqlClient: ReturnType<typeof neon> | null = null;
function getSql(): ReturnType<typeof neon> | null {
  if (sqlClient) return sqlClient;
  const url = process.env.NEON_DATABASE_URL;
  if (!url) return null;
  sqlClient = neon(url);
  return sqlClient;
}

/** Parse a `/avtomobil/{id}` (optional trailing slash) pathname → positive int id,
 *  or null if it isn't that route. */
export function parseAvtomobilId(pathname: string): number | null {
  const m = pathname.match(/^\/avtomobil\/(\d+)\/?$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** How long a loaded snapshot is served before a refresh is kicked off. */
const SNAPSHOT_TTL_MS = 30_000;

/**
 * Safety cap on the de-index id list. A paid delisting is sold one at a time, so
 * this should never be approached; if it ever is, we must NOT silently serve an
 * incomplete set (that would un-hide cars people paid to hide), so the snapshot
 * marks itself truncated and every check falls back to the per-id query.
 */
const DEINDEX_ID_CAP = 50_000;

type GoneSnapshot = {
  /** Car ids carrying a PAID de-index (`cars.deindexed_at IS NOT NULL`). */
  deindexed: Set<number>;
  /** The cap was hit ⇒ `deindexed` is incomplete and must not be trusted. */
  truncated: boolean;
  /** Is ANY archived row already past `SOLD_LOT_410_AFTER`? (reason-2 short-circuit) */
  anyLongDead: boolean;
};

let snapshot: GoneSnapshot | null = null;
let snapshotAt = 0;
let inFlight: Promise<GoneSnapshot | null> | null = null;

/** ONE round trip for both halves of the snapshot. */
async function loadSnapshot(): Promise<GoneSnapshot | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = (await sql`
    SELECT
      (
        SELECT coalesce(json_agg(t.id), '[]'::json)
        FROM (
          SELECT id FROM cars
          WHERE deindexed_at IS NOT NULL
          ORDER BY id
          LIMIT ${DEINDEX_ID_CAP + 1}
        ) t
      ) AS deindexed_ids,
      EXISTS (
        SELECT 1 FROM car_listings_archived
        WHERE archived_at IS NOT NULL
          AND archived_at < now() - ${SOLD_LOT_410_AFTER}::interval
      ) AS any_long_dead
  `) as { deindexed_ids: unknown; any_long_dead: unknown }[];

  const row = rows[0];
  if (!row) return null;

  // The driver's type parsers turn a `json` column into a JS array; parse a raw
  // string too rather than depend on that.
  const raw = row.deindexed_ids;
  const ids: number[] = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : [];

  return {
    deindexed: new Set(ids.slice(0, DEINDEX_ID_CAP)),
    truncated: ids.length > DEINDEX_ID_CAP,
    anyLongDead: row.any_long_dead === true,
  };
}

/** Single-flight refresh. Never rejects — a failed load leaves the previous
 *  snapshot (or `null`) in place and the caller falls back to a per-id query. */
function refreshSnapshot(): Promise<GoneSnapshot | null> {
  if (inFlight) return inFlight;
  inFlight = loadSnapshot()
    .then((next) => {
      if (next) {
        snapshot = next;
        snapshotAt = Date.now();
      }
      return next;
    })
    .catch((error: unknown) => {
      console.error("[sold-lot-gone] snapshot refresh failed", error);
      return null;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * The current snapshot, refreshed at most once per `SNAPSHOT_TTL_MS` per instance.
 * Stale-while-revalidate: once we have any snapshot, a request never waits on a
 * reload — only the first request on a cold instance pays for the query.
 */
async function getSnapshot(): Promise<GoneSnapshot | null> {
  if (snapshot !== null) {
    if (Date.now() - snapshotAt >= SNAPSHOT_TTL_MS) void refreshSnapshot();
    return snapshot;
  }
  return refreshSnapshot();
}

/**
 * The original per-id check, kept verbatim as the fallback for the cases the
 * snapshot can't answer (reason 2 once it activates; a truncated or unavailable
 * snapshot). Both reasons in ONE round trip, both sides PK point lookups —
 * `cars_pkey` and, through the LEFT JOIN, `car_listings_archived`'s `car_id`
 * primary key. The join direction is safe because
 * `car_listings_archived.car_id` references `cars(id)` ON DELETE CASCADE, so an
 * archived row cannot outlive its car. Fails closed to `false`.
 */
async function isCarGoneUncached(id: number): Promise<boolean> {
  try {
    const sql = getSql();
    if (!sql) return false;
    const rows = (await sql`
      SELECT 1
      FROM cars c
      LEFT JOIN car_listings_archived a ON a.car_id = c.id
      WHERE c.id = ${id}
        AND (
          c.deindexed_at IS NOT NULL
          OR (
            a.archived_at IS NOT NULL
            AND a.archived_at < now() - ${SOLD_LOT_410_AFTER}::interval
          )
        )
      LIMIT 1
    `) as unknown[];
    return rows.length > 0;
  } catch (error) {
    console.error("[sold-lot-gone] 410 check failed, not gone", error);
    return false;
  }
}

/**
 * True iff car `id` should 410 — either paid-de-indexed, or archived long enough
 * ago. Fails closed to false.
 */
export async function isCarGone(id: number): Promise<boolean> {
  try {
    const snap = await getSnapshot();
    if (snap && !snap.truncated) {
      if (snap.deindexed.has(id)) return true;
      // Nothing is old enough to 410 yet ⇒ answered with zero DB round trips.
      if (!snap.anyLongDead) return false;
    }
    return await isCarGoneUncached(id);
  } catch (error) {
    console.error("[sold-lot-gone] 410 check failed, not gone", error);
    return false;
  }
}
