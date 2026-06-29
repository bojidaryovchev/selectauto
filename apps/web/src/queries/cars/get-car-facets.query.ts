import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { COLOR_BG, bodyTypeLabel, colorLabel, conditionLabel, driveLabel, vehicleTypeLabel } from "@/lib/car-labels";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getDb, schema } from "@/lib/db";
import type { FacetOption, FacetOptions } from "@/types/car-filters.type";

const cf = schema.carListingFacets;

/**
 * Which projection the facets describe. The catalog filter bar is shown on both
 * the active and past views; today it reflects the ACTIVE catalog regardless (the
 * page calls getCarFacets() with no args), so we read the 'active' summary rows.
 * The summary table also holds 'past' rows, so a status-aware facet bar is a
 * one-line change here if ever wanted.
 */
const FACET_TABLE_KIND = "active";

/**
 * Year-facet clamp window. The data carries junk years (0, 206, 1900, …) that
 * would clutter the dropdown. Static bounds (kept deterministic — not derived from
 * `new Date()`); bump YEAR_MAX over time. Matches the filter-bar "Година до"
 * placeholder (2027).
 */
const YEAR_MIN = 1980;
const YEAR_MAX = 2027;

/** Empty facet set — the safe fallback when the DB is slow/unreachable so a page
 *  (catalog filter bar, homepage brand grid) renders instead of hard-failing. */
const EMPTY_FACETS: FacetOptions = {
  brands: [],
  modelsByBrand: {},
  colors: [],
  drives: [],
  conditions: [],
  types: [],
  years: [],
};

/**
 * Just the brand list (external id + name), for components that only need to map
 * a brand NAME → its catalog filter id — e.g. the homepage "Популярни марки" grid.
 *
 * This is a deliberately cheap subset of `getCarFacets`: the full facets query
 * computes models-per-brand, colors, years and type counts with several joins +
 * GROUP BYs over the whole projection (~5s cold), which is far too heavy to run on
 * the homepage and was a cause of production-build statement timeouts. This single
 * `manufacturers` read (~75ms) returns every brand name; the caller resolves ids
 * from it.
 *
 * Cached with `"use cache"` + `cacheLife("days")`: the brand list is tiny, shared,
 * and changes only with the daily reference sync. Crucially, this is what lets the
 * homepage PRERENDER into a static shell — it's rendered synchronously by the
 * `PopularBrandsSection`/`BrandsGrid` server component (not under a Suspense
 * boundary), so an uncached read here forces the whole route dynamic ("Uncached
 * data accessed outside of <Suspense>"). Caching it is the principled fix that
 * replaced a blunt `connection()` call on the homepage. Function-level directive
 * (NOT file-level) so the heavier `getCarFacets` below stays uncached. Returns []
 * on DB error so the homepage still renders.
 */
export async function getCarBrands(): Promise<FacetOption[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  try {
    const rows = await getDb()
      .select({ value: schema.manufacturers.externalId, label: schema.manufacturers.name })
      .from(schema.manufacturers)
      .orderBy(asc(schema.manufacturers.name));
    return rows
      .filter((r) => r.value != null)
      .map((r) => ({ value: String(r.value), label: r.label ?? `#${r.value}` }));
  } catch (error) {
    console.error("[get-car-brands] query failed, returning []", error);
    return [];
  }
}

/**
 * Options for the catalog filter dropdowns. Reads the precomputed
 * `car_listing_facets` summary table (migration 0017) — which dimension VALUES
 * actually appear in the projection, with counts — instead of running 8 GROUP-BY/
 * DISTINCT passes over the full ~916k-row projection. Those passes contended on a
 * single Neon compute and measured ~2.2–3.4s wall via Promise.all (slower than the
 * slowest single scan); the summary read is ~40–130ms per dimension over ~2.1k
 * rows. The summary is maintained incrementally by the same recompute_*_counted
 * wrappers that maintain car_listings/car_listing_counts (see shared/db.ts), so it
 * stays live without a cache.
 *
 * Brand/model NAMES are NOT in the summary (Flow 4 renames without touching lots →
 * a denormalized name would go stale; see docs/05 §5). They are resolved HERE by
 * an INNER JOIN from the summary's ids to manufacturers/vehicle_models — which, as
 * a side effect, drops any value with no name to display (matching the previous
 * live query exactly: parity verified, 117 brands / 1286 models, zero diff).
 * Color/drive/condition/type get BG labels here. modelsByBrand is keyed by
 * manufacturer external id (string).
 *
 * Still NOT app-cached: each read is a cheap index scan, so it reads Neon directly.
 */
export async function getCarFacets(): Promise<FacetOptions> {
  try {
    return await computeCarFacets();
  } catch (error) {
    // Never hard-fail a render on facets (it's the heaviest query set). An empty
    // facet set degrades the filter dropdowns gracefully; the catalog still works.
    // This also keeps a slow build-time prerender from failing the whole build.
    console.error("[get-car-facets] query failed, returning empty facets", error);
    return EMPTY_FACETS;
  }
}

async function computeCarFacets(): Promise<FacetOptions> {
  const db = getDb();

  // All reads hit the tiny car_listing_facets summary (~2.1k rows for 'active'),
  // not the ~916k-row projection. Brand/model reads INNER JOIN manufacturers/
  // vehicle_models to resolve names (dropping nameless ids, as the old live query
  // did); the rest read raw values straight from the summary. Each is a cheap
  // index scan, so firing them concurrently has no contention (unlike the old 8
  // full-projection aggregates). Intermediate row shapes match the old query, so
  // the label/ordering/grouping logic below is unchanged.
  const tk = FACET_TABLE_KIND;
  const [brandRows, modelRows, colorRows, driveRows, condRows, yearRows, vtRows, btRows] = await Promise.all([
    // Brands that appear in the catalog, with their display name (summary id →
    // manufacturers; the join drops ids with no manufacturers row, as before).
    db
      .select({ value: schema.manufacturers.externalId, label: schema.manufacturers.name })
      .from(cf)
      .innerJoin(schema.manufacturers, sql`${schema.manufacturers.externalId}::text = ${cf.val}`)
      .where(and(eq(cf.tableKind, tk), eq(cf.dim, "brand")))
      .orderBy(asc(schema.manufacturers.name)),

    // Models per brand. The summary carries the parent brand id in `val2`, so we
    // group by it without re-reading the projection; join resolves the model name.
    db
      .select({
        brand: sql<number>`${cf.val2}::bigint`,
        value: schema.vehicleModels.externalId,
        label: schema.vehicleModels.name,
      })
      .from(cf)
      .innerJoin(schema.vehicleModels, sql`${schema.vehicleModels.externalId}::text = ${cf.val}`)
      .where(and(eq(cf.tableKind, tk), eq(cf.dim, "model"), sql`${cf.val2} <> ''`))
      .orderBy(asc(schema.vehicleModels.name)),

    // Colors present (BG-labelled + ordered below).
    db.select({ color: cf.val }).from(cf).where(and(eq(cf.tableKind, tk), eq(cf.dim, "color"))),

    // Drives present (front/all/rear), BG-labelled below.
    db.select({ drive: cf.val }).from(cf).where(and(eq(cf.tableKind, tk), eq(cf.dim, "drive"))),

    // Conditions present, with counts (grouped by BG label below).
    db
      .select({ value: cf.val, n: sql<number>`${cf.n}::int` })
      .from(cf)
      .where(and(eq(cf.tableKind, tk), eq(cf.dim, "condition"))),

    // Years present (already clamped to [YEAR_MIN, YEAR_MAX] when the summary is
    // built — see migration 0017's listing_facet_keys). Newest first.
    db
      .select({ year: sql<number>`${cf.val}::int` })
      .from(cf)
      .where(and(eq(cf.tableKind, tk), eq(cf.dim, "year")))
      .orderBy(sql`${cf.val}::int DESC`),

    // Non-car vehicle_types, with counts.
    db
      .select({ value: cf.val, n: sql<number>`${cf.n}::int` })
      .from(cf)
      .where(and(eq(cf.tableKind, tk), eq(cf.dim, "vtype"))),

    // Body types that automobiles actually have, with counts (the summary only
    // stores btype keys for vehicle_type='automobile' — see 0017).
    db
      .select({ value: cf.val, n: sql<number>`${cf.n}::int` })
      .from(cf)
      .where(and(eq(cf.tableKind, tk), eq(cf.dim, "btype"))),
  ]);

  const brands = brandRows
    .filter((r) => r.value != null)
    .map((r) => ({ value: String(r.value), label: r.label ?? `#${r.value}` }));

  const modelsByBrand: FacetOptions["modelsByBrand"] = {};
  for (const r of modelRows) {
    if (r.brand == null || r.value == null) continue;
    const key = String(r.brand);
    (modelsByBrand[key] ??= []).push({ value: String(r.value), label: r.label ?? `#${r.value}` });
  }

  // Colors present, BG-labelled, ordered by the canonical enum order (COLOR_BG keys).
  const colorOrder = Object.keys(COLOR_BG);
  const colors = colorRows
    .map((r) => r.color as string)
    .filter(Boolean)
    .sort((a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b))
    .map((c) => ({ value: c, label: colorLabel(c) }));

  // Drives present (front/all/rear), BG-labelled.
  const drives = driveRows
    .map((r) => r.drive as string)
    .filter(Boolean)
    .map((d) => ({ value: d, label: driveLabel(d) }));

  // Conditions present, grouped BY BG LABEL: several raw values collapse to one
  // buyer-facing label (run_and_drives + engine_starts both → "Пали и се движи"),
  // so the option's value is the comma-joined raw set and the query matches with
  // IN(...) — picking the label must catch all underlying raws. Ordered by count.
  const condByLabel = new Map<string, { values: string[]; count: number }>();
  for (const r of condRows) {
    const raw = r.value as string;
    if (!raw) continue;
    const label = conditionLabel(raw);
    if (!label) continue; // unmapped/blank → don't offer as a filter
    const entry = condByLabel.get(label) ?? { values: [], count: 0 };
    entry.values.push(raw);
    entry.count += r.n;
    condByLabel.set(label, entry);
  }
  const conditions = [...condByLabel.entries()]
    .map(([label, { values, count }]) => ({ value: values.join(","), label, count }))
    .sort((a, b) => b.count - a.count);

  // Years present, newest first. Clamp to a sane window — the data carries junk
  // years (0, 206, 1900, …) that would clutter the dropdown. (Queried above.)
  const years = yearRows
    .map((r) => r.year as number)
    .filter((y) => Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX);

  // Combined "Тип" options: non-car vehicle_types (vt:*) + the body_types that
  // automobiles actually have (bt:*). Each with a count, ordered by frequency, so
  // the dropdown leads with the common types and surfaces boats/moto/etc too.
  const typeOpts: { value: string; label: string; count: number }[] = [];
  for (const r of vtRows) {
    const v = r.value as string;
    if (!v || v === "automobile") continue; // automobile is split into body types below
    typeOpts.push({ value: `vt:${v}`, label: vehicleTypeLabel(v), count: r.n });
  }
  for (const r of btRows) {
    const v = r.value as string;
    if (!v) continue;
    typeOpts.push({ value: `bt:${v}`, label: bodyTypeLabel(v), count: r.n });
  }
  const types = typeOpts.sort((a, b) => b.count - a.count);

  return { brands, modelsByBrand, colors, drives, conditions, types, years };
}
