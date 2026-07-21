import { and, eq, inArray, sql } from "drizzle-orm";
import { buildListingConditions, tableFor } from "@/lib/car-listing-conditions";
import { getDb, schema } from "@/lib/db";
import type { CarFilters } from "@/types/car-filters.type";

const clc = schema.carListingCounts;
const cf = schema.carListingFacets;

/**
 * Resolve the BROAD count for a filter set from the car_listing_counts summary
 * table (migration 0016) — an O(1) PK lookup instead of a full-table COUNT(*)
 * (~750k-row seq scan, the cause of the slow "Намерени автомобили" on big
 * markets). Returns null when the filter set is NOT purely a broad page-tab combo
 * (i.e. any narrow dropdown/range filter is set), in which case the caller falls
 * back to a live COUNT. That fallback is only cheap because EVERY filterable
 * column now has a matching index: the (col, sort_id DESC) composites from
 * migrations 0008/0015/0021 plus 0036, which added drive_wheel/condition and the
 * partial sale_date index — before 0036, a weak-only selection (just Задвижване /
 * Състояние / an auction-window tab) was a ~1s parallel seq scan per request.
 *
 * "Broad" = only status (active/past), market, and channel may be set. The
 * (dim, val) key MUST match how listing_count_keys() bucketed each row:
 *   none        → ('total','')
 *   market only → ('country', <USA|kr|Canada>)
 *   channel only→ ('channel', <buy-now|auction>)
 *   both        → ('country+channel', '<country>|<channel>')
 */
async function getBroadCount(filters: CarFilters): Promise<number | null> {
  // Any narrow filter present → not a broad combo; caller does a live COUNT.
  const hasNarrow =
    // Auction window is a sale_date range with no precomputed bucket in the
    // summary table → treat as narrow so the live COUNT path handles it (fast
    // over the ≤13.5% future-dated subset).
    filters.auctionWindow !== undefined ||
    filters.brand !== undefined ||
    filters.model !== undefined ||
    filters.color !== undefined ||
    filters.drive !== undefined ||
    filters.fuel !== undefined ||
    filters.condition !== undefined ||
    filters.type !== undefined ||
    filters.yearFrom !== undefined ||
    filters.yearTo !== undefined ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined;
  if (hasNarrow) return null;

  const tableKind = filters.status === "past" ? "past" : "active";

  // Map market → the location_country value the counter stores (same as the
  // page query's predicate: us→USA, kr→kr, ca→Canada).
  const country =
    filters.market === "us" ? "USA" : filters.market === "kr" ? "kr" : filters.market === "ca" ? "Canada" : undefined;
  const channel = filters.channel === "buy-now" ? "buy-now" : filters.channel === "auction" ? "auction" : undefined;

  let dim: string;
  let val: string;
  if (country && channel) {
    dim = "country+channel";
    val = `${country}|${channel}`;
  } else if (country) {
    dim = "country";
    val = country;
  } else if (channel) {
    dim = "channel";
    val = channel;
  } else {
    dim = "total";
    val = "";
  }

  const rows = await getDb()
    .select({ n: clc.n })
    .from(clc)
    .where(and(eq(clc.tableKind, tableKind), eq(clc.dim, dim), eq(clc.val, val)))
    .limit(1);

  // A key with count 0 legitimately may not have a row; treat missing as 0.
  return rows[0]?.n ?? 0;
}

/**
 * Resolve a SINGLE-DIM filter state from the `car_listing_facets` summary
 * (migration 0017) — the same O(1) trick `getBroadCount` plays with
 * `car_listing_counts`, reusing counts the summary already maintains for the
 * dropdowns. Returns null when the state isn't coverable, and the caller falls
 * back to a live COUNT.
 *
 * Why: the live fallback is only cheap when the predicate is *selective*. A
 * weak-only selection (just Задвижване / Състояние / a common Гориво) matches
 * 30–70% of the ~950k-row projection, where ANY plan — seq scan or bitmap — is
 * seconds-cold on Neon (EXPLAIN 2026-07-21: drive-only 1.1–4.1s, condition-only
 * 0.9–4.5s). The facet summary already stores these exact numbers (parity
 * spot-checked against live COUNT(*): drive/condition/fuel all matched exactly).
 *
 * Coverable: exactly ONE of {brand[+model], color, drive, fuel, condition,
 * vt-type} set, with no market/channel/window/year/price (facet counts are
 * GLOBAL per table_kind — any second predicate invalidates them). Deliberately
 * NOT covered (semantics diverge from the live predicate, verified against the
 * live `listing_facet_keys` definition):
 *  - `year`: the summary clamps to [1980, 2027]; the live range predicate
 *    doesn't. Lives on the indexed cl_year_sort instead.
 *  - `bt:` types: the summary counts body_type only for vehicle_type =
 *    'automobile', but 36 528 non-automobile rows carry a body_type the live
 *    `eq(body_type)` predicate would match.
 * Condition values are comma-joined raw sets (one BG label → several raws), so
 * the count SUMs the raws' disjoint facet rows — same result as the live IN().
 * A brand+model pair is one group (a model implies its brand); the `val2` guard
 * makes a mismatched hand-edited pair count 0, exactly like the live query.
 */
async function getSingleDimFacetCount(filters: CarFilters): Promise<number | null> {
  if (filters.market !== undefined || filters.channel !== undefined || filters.auctionWindow !== undefined) return null;
  if (filters.yearFrom !== undefined || filters.yearTo !== undefined) return null;
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) return null;

  // Exactly one dimension group may be active (brand+model count as one).
  const groups = [
    filters.brand !== undefined || filters.model !== undefined,
    !!filters.color,
    !!filters.drive,
    !!filters.fuel,
    !!filters.condition,
    !!filters.type,
  ].filter(Boolean).length;
  if (groups !== 1) return null;

  let dim: string;
  let vals: string[];
  let val2: string | undefined;
  if (filters.model !== undefined) {
    dim = "model";
    vals = [String(filters.model)];
    // The summary keys models by (val=model, val2=brand); guard the pair so a
    // model that doesn't belong to the selected brand counts 0, like the live query.
    if (filters.brand !== undefined) val2 = String(filters.brand);
  } else if (filters.brand !== undefined) {
    dim = "brand";
    vals = [String(filters.brand)];
  } else if (filters.color) {
    dim = "color";
    vals = [filters.color];
  } else if (filters.drive) {
    dim = "drive";
    vals = [filters.drive];
  } else if (filters.fuel) {
    dim = "fuel";
    vals = [filters.fuel];
  } else if (filters.condition) {
    vals = filters.condition.split(",").filter(Boolean);
    if (vals.length === 0) return null;
    dim = "condition";
  } else if (filters.type) {
    const [kind, value] = filters.type.split(":");
    if (kind !== "vt" || !value) return null; // bt: diverges — see docstring
    dim = "vtype";
    vals = [value];
  } else {
    return null;
  }

  const tableKind = filters.status === "past" ? "past" : "active";
  const conds = [
    eq(cf.tableKind, tableKind),
    eq(cf.dim, dim),
    vals.length === 1 ? eq(cf.val, vals[0]) : inArray(cf.val, vals),
  ];
  if (val2 !== undefined) conds.push(eq(cf.val2, val2));

  // A value with no row legitimately counts 0 (facet rows can also sit at n=0).
  const rows = await getDb()
    .select({ n: sql<number>`coalesce(sum(${cf.n}), 0)::int` })
    .from(cf)
    .where(and(...conds));
  return rows[0]?.n ?? 0;
}

/** The exact number of cars matching the filters. */
export type CarsCount = { count: number };

/**
 * **Exact** count of cars matching the filters — we show the true number
 * ("Намерени: 12 743"), not a "1000+" cap.
 *
 * Resolution order, cheapest first:
 *  1. Broad page-tab views (market × channel × active/past) → the precomputed
 *     `car_listing_counts` summary, an O(1) PK lookup (~35ms; migration 0016).
 *  2. Single-dim states (one of brand[+model]/color/drive/fuel/condition/vt-type,
 *     nothing else) → the `car_listing_facets` summary, equally O(1) — these
 *     include the LOW-selectivity dims whose live COUNT is a seconds-cold scan
 *     (see `getSingleDimFacetCount`).
 *  3. Everything else → a live single-table `COUNT(*)`; the remaining states
 *     carry a selective, indexed predicate (brand/model/year/price composites
 *     from 0008/0015/0021/0036) so the scan is bounded.
 * Not app-cached — reads Neon directly each request.
 */
export async function getCarsCount(filters: CarFilters): Promise<CarsCount> {
  const db = getDb();

  // Search results are shown as a list; the header is hidden for search.
  if (filters.search && filters.search.trim() !== "") {
    return { count: 0 };
  }

  // Broad page-tab views (market × channel × active/past) → O(1) summary-table
  // lookup, avoiding the ~750k-row COUNT(*) seq scan. Narrow filters fall through.
  const broad = await getBroadCount(filters);
  if (broad !== null) return { count: broad };

  // Single-dim weak filters → O(1) facets-summary lookup (exact; see docstring).
  const single = await getSingleDimFacetCount(filters);
  if (single !== null) return { count: single };

  const t = tableFor(filters);
  const conds = buildListingConditions(filters, t);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined);
  return { count: rows[0]?.n ?? 0 };
}
