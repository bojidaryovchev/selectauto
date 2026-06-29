import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { COLOR_BG, bodyTypeLabel, colorLabel, conditionLabel, driveLabel, vehicleTypeLabel } from "@/lib/car-labels";
import { getDb, schema } from "@/lib/db";
import type { FacetOption, FacetOptions } from "@/types/car-filters.type";

const cl = schema.carListings;

/**
 * Year-facet clamp window. The data carries junk years (0, 206, 1900, …) that
 * would clutter the dropdown. Static bounds (a `"use cache"` scope shouldn't
 * depend on `new Date()`); bump YEAR_MAX over time. Matches the filter-bar
 * "Година до" placeholder (2027).
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
 * from it. Cached for a day; returns [] on DB error so the homepage still renders.
 */
export async function getCarBrands(): Promise<FacetOption[]> {
  "use cache: remote";
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
 * Options for the catalog filter dropdowns. Brands/models come from the
 * reference tables (manufacturers/vehicle_models) restricted to those that
 * actually have active cars; colors/years from DISTINCT over car_listings.
 * Cheap + slow-changing → cached for a day. Color/drive get BG labels here.
 *
 * Brand/model NAMES are resolved here (not stored on car_listings) — see
 * DB-design §7. modelsByBrand is keyed by manufacturer external id (string).
 */
export async function getCarFacets(): Promise<FacetOptions> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

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

  // The eight facet reads are independent single-table aggregates, so fire them
  // concurrently rather than sequentially. On Vercel (function in fra1, Neon in
  // eu-central-1) each round trip is cheap, but 8 serial awaits still stack up;
  // running them in parallel collapses the wall time to roughly the slowest one.
  const [brandRows, modelRows, colorRows, driveRows, condRows, yearRows, vtRows, btRows] = await Promise.all([
    // Brands that actually appear in the catalog, with their display name.
    db
      .select({
        value: schema.manufacturers.externalId,
        label: schema.manufacturers.name,
      })
      .from(schema.manufacturers)
      .innerJoin(cl, sql`${cl.manufacturerId} = ${schema.manufacturers.externalId}`)
      .groupBy(schema.manufacturers.externalId, schema.manufacturers.name)
      .orderBy(asc(schema.manufacturers.name)),

    // Models per brand (only those with active cars). Keyed by brand external id.
    db
      .select({
        brand: cl.manufacturerId,
        value: schema.vehicleModels.externalId,
        label: schema.vehicleModels.name,
      })
      .from(schema.vehicleModels)
      .innerJoin(cl, sql`${cl.modelId} = ${schema.vehicleModels.externalId}`)
      .groupBy(cl.manufacturerId, schema.vehicleModels.externalId, schema.vehicleModels.name)
      .orderBy(asc(schema.vehicleModels.name)),

    // Colors present (BG-labelled + ordered below).
    db.selectDistinct({ color: cl.carColor }).from(cl).where(isNotNull(cl.carColor)),

    // Drives present (front/all/rear), BG-labelled below.
    db.selectDistinct({ drive: cl.driveWheel }).from(cl).where(isNotNull(cl.driveWheel)),

    // Conditions present, with counts (grouped by BG label below).
    db
      .select({ value: cl.condition, n: sql<number>`count(*)::int` })
      .from(cl)
      .where(isNotNull(cl.condition))
      .groupBy(cl.condition),

    // Years present, clamped to a sane window (the data carries junk years).
    db
      .selectDistinct({ year: cl.carYear })
      .from(cl)
      .where(sql`${cl.carYear} BETWEEN ${YEAR_MIN} AND ${YEAR_MAX}`)
      .orderBy(sql`${cl.carYear} DESC`),

    // Non-car vehicle_types, with counts.
    db
      .select({ value: cl.vehicleType, n: sql<number>`count(*)::int` })
      .from(cl)
      .where(isNotNull(cl.vehicleType))
      .groupBy(cl.vehicleType),

    // Body types that automobiles actually have, with counts.
    db
      .select({ value: cl.bodyType, n: sql<number>`count(*)::int` })
      .from(cl)
      .where(and(eq(cl.vehicleType, "automobile"), isNotNull(cl.bodyType)))
      .groupBy(cl.bodyType),
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
