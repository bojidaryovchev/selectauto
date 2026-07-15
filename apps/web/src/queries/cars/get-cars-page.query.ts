import { and, asc, desc, eq, gt, ilike, lt, lte, or, sql } from "drizzle-orm";
import { CARS_PAGE_SIZE } from "@/constants";
import { buildListingConditions as buildConditions, tableFor } from "@/lib/car-listing-conditions";
import { carListingToView } from "@/lib/car-mapper";
import { getDb } from "@/lib/db";
import type { CarFilters, CarsPage } from "@/types/car-filters.type";

// Re-exported for existing server consumers that import it from the query barrel;
// the canonical definition now lives in `@/constants` (client-safe). See there.
export { CARS_PAGE_SIZE };

// The WHERE builder + read-model selector now live in `@/lib/car-listing-conditions`
// (shared with get-cars-count and get-car-facets so the feed, the count and the
// facet counts stay in lockstep). `buildConditions`/`ListingTable` are aliased on
// import so this file's call sites read unchanged.

/** Postgres `integer` bounds — `sort_id`'s column type. A cursor outside this
 *  range can't identify a row and would make the comparison throw (SQLSTATE
 *  22003, "out of range for type integer"), so we treat it as absent. */
const PG_INT_MIN = -2147483648;
const PG_INT_MAX = 2147483647;

/**
 * Decode the opaque keyset cursor (a row's sort_id) — null if absent, malformed,
 * or outside the `integer` range. Guarding the range here means a garbage
 * `?after=` value (e.g. an over-large number) degrades to a normal first page
 * instead of erroring the query.
 */
function decodeCursor(cursor: string | null): number | null {
  if (!cursor) return null;
  const n = Number(cursor);
  if (!Number.isInteger(n) || n < PG_INT_MIN || n > PG_INT_MAX) return null;
  return n;
}

/**
 * The exact-lookup search branch, shared by every entry point. Search is not a
 * feed (see DB-design §5): an exact lot-prefix / VIN match, capped, with no
 * keyset in either direction (`prevCursor`/`nextCursor` both null).
 */
async function searchPage(filters: CarFilters): Promise<CarsPage> {
  const db = getDb();
  const t = tableFor(filters);
  const isPast = filters.status === "past";
  const q = (filters.search ?? "").trim();
  const rows = await db
    .select()
    .from(t)
    .where(or(ilike(t.lotNumber, `${q}%`), eq(t.vin, q.toUpperCase())))
    .limit(CARS_PAGE_SIZE);
  return { cars: rows.map((r) => carListingToView(r, isPast)), nextCursor: null, prevCursor: null };
}

/**
 * One keyset page in a single direction.
 *
 *  - **forward** (scroll DOWN): `sort_id < cursor ORDER BY sort_id DESC`, the
 *    original catalog feed. `cursor === null` → the newest page (list top).
 *  - **backward** (scroll UP): `sort_id > cursor ORDER BY sort_id ASC`, then the
 *    rows are reversed so the returned page is still newest-first (DESC) for
 *    display. Fills the catalog window upward from a `?after=` deep link.
 *
 * Both fetch PAGE+1 to detect whether another page exists in that direction.
 * Both walk the SAME `(… , sort_id DESC)` indexes (migrations 0008/0011/0015) —
 * a B-tree serves the ASC scan in reverse, so backward paging is equally
 * flat-cost (no seq scan). See AGENTS.md / docs/05-projection-tables-car-listings.md §5.
 */
async function keysetPage(
  filters: CarFilters,
  cursor: string | null,
  direction: "forward" | "backward",
): Promise<CarsPage> {
  const db = getDb();
  const t = tableFor(filters);
  const isPast = filters.status === "past";

  const conds = buildConditions(filters, t);
  const cursorId = decodeCursor(cursor);
  if (cursorId !== null) conds.push(direction === "forward" ? lt(t.sortId, cursorId) : gt(t.sortId, cursorId));

  const rows = await db
    .select()
    .from(t)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(direction === "forward" ? desc(t.sortId) : asc(t.sortId))
    .limit(CARS_PAGE_SIZE + 1);

  const hasMore = rows.length > CARS_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, CARS_PAGE_SIZE) : rows;
  // Backward pages come back ASC (nearest-above first); flip to DESC so the whole
  // catalog stays newest-first regardless of which way we paged.
  const orderedRows = direction === "forward" ? pageRows : pageRows.slice().reverse();
  const cars = orderedRows.map((r) => carListingToView(r, isPast));

  if (direction === "forward") {
    // Boundary is the last (lowest sort_id) row → the next forward cursor.
    const nextCursor = hasMore ? String(pageRows[pageRows.length - 1].sortId) : null;
    return { cars, nextCursor };
  }
  // Backward: boundary is the highest sort_id row we returned (now first after the
  // flip) → the next backward cursor. nextCursor is left undefined here — the
  // caller already owns the downward cursor for this window.
  const prevCursor = hasMore ? String(orderedRows[0].sortId) : null;
  return { cars, nextCursor: null, prevCursor };
}

/**
 * One page of catalog results for the given filters + forward cursor.
 *
 * Two query shapes (verified by EXPLAIN — see DB-design §5):
 *  - **Search** (lot number / VIN present): an exact LOOKUP — no keyset, no
 *    sort_id ordering (adding it makes the planner ignore the lot/vin index).
 *  - **Feed** (everything else): keyset pagination on `sort_id DESC`, fetching
 *    PAGE+1 to detect a next page. Flat cost at any depth.
 *
 * This is the forward/first-paint path (unchanged behavior): the SSR first page
 * (`cursor === null`) and the downward infinite scroll. Not cached: reads Neon
 * directly per request (keyset feed is flat-cost). The page passes parsed filters
 * as args rather than reading `searchParams` here.
 */
export async function getCarsPage(filters: CarFilters, cursor: string | null): Promise<CarsPage> {
  if (filters.search && filters.search.trim() !== "") return searchPage(filters);
  return keysetPage(filters, cursor, "forward");
}

/**
 * The page immediately ABOVE `cursor` (newer cars, `sort_id > cursor`). The
 * upward/reverse counterpart of `getCarsPage`, filling the catalog's reserved
 * space upward from a `?after=` deep link. Returns `prevCursor` for the next
 * upward step (null at the list top). Search has no feed, so it yields an
 * empty terminal page.
 */
export async function getPrevCarsPage(filters: CarFilters, cursor: string | null): Promise<CarsPage> {
  if (filters.search && filters.search.trim() !== "") return { cars: [], nextCursor: null, prevCursor: null };
  return keysetPage(filters, cursor, "backward");
}

/**
 * Seed a WINDOW of the feed centered on a shared `?after=` anchor (a `sort_id`),
 * for deep links that land mid-catalog. Fetches the anchor page (the anchor row
 * and PAGE-1 cars below it: `sort_id <= anchor DESC`) plus one page ABOVE it
 * (`sort_id > anchor ASC`), stitched newest-first. Returns:
 *  - `cars` — the above-page followed by the anchor-page (DESC across the seam),
 *  - `nextCursor` — to keep scrolling DOWN from the anchor page,
 *  - `prevCursor` — to keep scrolling UP from the above-page (null if none),
 *  - `anchorId` — the sort_id the client should scroll to the top: the anchor row
 *    itself when it still matches the filters, else the NEAREST surviving row at/
 *    under it (so a sold/archived anchor still restores the position); null only
 *    when nothing at or below the anchor matches.
 *
 * Both halves walk the `(…, sort_id DESC)` indexes; the anchor page is the same
 * flat-cost keyset read as any other page, the above-page an ASC scan of the same
 * B-tree. On a search filter (no feed) this degrades to the normal search page.
 * Not cached — reads Neon directly, like getCarsPage.
 */
export async function getCarsWindow(
  filters: CarFilters,
  anchor: string,
): Promise<CarsPage & { anchorId: string | null; aboveCount: number }> {
  if (filters.search && filters.search.trim() !== "") {
    const page = await searchPage(filters);
    return { ...page, anchorId: null, aboveCount: 0 };
  }

  const anchorId = decodeCursor(anchor);
  if (anchorId === null) {
    // Malformed pointer → behave like a normal first paint.
    const page = await keysetPage(filters, null, "forward");
    return { ...page, anchorId: null, aboveCount: 0 };
  }

  const db = getDb();
  const t = tableFor(filters);
  const isPast = filters.status === "past";

  // Anchor page: the anchor row (inclusive) + up to PAGE-1 cars below it. PAGE+1
  // fetched to know whether more exist further down.
  const belowConds = buildConditions(filters, t);
  belowConds.push(lte(t.sortId, anchorId));
  const belowRows = await db
    .select()
    .from(t)
    .where(belowConds.length > 0 ? and(...belowConds) : undefined)
    .orderBy(desc(t.sortId))
    .limit(CARS_PAGE_SIZE + 1);

  const belowHasMore = belowRows.length > CARS_PAGE_SIZE;
  const belowPage = belowHasMore ? belowRows.slice(0, CARS_PAGE_SIZE) : belowRows;
  const nextCursor = belowHasMore ? String(belowPage[belowPage.length - 1].sortId) : null;

  // One page ABOVE the anchor (newer). ASC scan, then flipped to DESC for display.
  const above = await keysetPage(filters, anchor, "backward");

  // Which card should the client scroll to the top? The first below-page row:
  // the anchor itself when it still matches the filters, otherwise the NEAREST
  // surviving card at/under it (listings churn constantly — a sold/archived
  // anchor must still restore the position rather than silently landing a full
  // page above it). Null only when nothing at or below the anchor matches, in
  // which case the window degenerates to just the above-page shown from its top.
  const anchorRow = belowPage[0];

  const cars = [...above.cars, ...belowPage.map((r) => carListingToView(r, isPast))];

  // How many matching rows sit ABOVE this window's first row — the window's
  // absolute position in the filtered feed. The client grid reserves space for
  // the WHOLE feed up front (fixed-position rows, skeletons for unloaded ones),
  // so upward pages fill in without ever moving existing content or scrollTop;
  // this count pins the window into that fixed coordinate space. Index-only
  // range count on the same (…, sort_id) B-trees — cost scales with the depth
  // of the link, which for organic pointers is a handful of pages.
  let aboveCount = 0;
  const windowTop = cars[0]?.sortId;
  if (windowTop !== undefined) {
    const aboveConds = buildConditions(filters, t);
    aboveConds.push(gt(t.sortId, windowTop));
    const res = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(t)
      .where(and(...aboveConds));
    aboveCount = res[0]?.n ?? 0;
  }

  return {
    cars,
    nextCursor,
    prevCursor: above.prevCursor ?? null,
    anchorId: anchorRow ? String(anchorRow.sortId) : null,
    aboveCount,
  };
}
