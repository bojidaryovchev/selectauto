import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { COLOR_BG, bodyTypeLabel, colorLabel, driveLabel, vehicleTypeLabel } from "@/lib/car-labels";
import { getDb, schema } from "@/lib/db";
import type { FacetOptions } from "@/types/car-filters.type";

const cl = schema.carListings;

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
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const db = getDb();

  // Brands that actually appear in the catalog, with their display name.
  const brandRows = await db
    .select({
      value: schema.manufacturers.externalId,
      label: schema.manufacturers.name,
    })
    .from(schema.manufacturers)
    .innerJoin(cl, sql`${cl.manufacturerId} = ${schema.manufacturers.externalId}`)
    .groupBy(schema.manufacturers.externalId, schema.manufacturers.name)
    .orderBy(asc(schema.manufacturers.name));

  const brands = brandRows
    .filter((r) => r.value != null)
    .map((r) => ({ value: String(r.value), label: r.label ?? `#${r.value}` }));

  // Models per brand (only those with active cars). Keyed by brand external id.
  const modelRows = await db
    .select({
      brand: cl.manufacturerId,
      value: schema.vehicleModels.externalId,
      label: schema.vehicleModels.name,
    })
    .from(schema.vehicleModels)
    .innerJoin(cl, sql`${cl.modelId} = ${schema.vehicleModels.externalId}`)
    .groupBy(cl.manufacturerId, schema.vehicleModels.externalId, schema.vehicleModels.name)
    .orderBy(asc(schema.vehicleModels.name));

  const modelsByBrand: FacetOptions["modelsByBrand"] = {};
  for (const r of modelRows) {
    if (r.brand == null || r.value == null) continue;
    const key = String(r.brand);
    (modelsByBrand[key] ??= []).push({ value: String(r.value), label: r.label ?? `#${r.value}` });
  }

  // Colors present, BG-labelled, ordered by the canonical enum order (COLOR_BG keys).
  const colorRows = await db
    .selectDistinct({ color: cl.carColor })
    .from(cl)
    .where(isNotNull(cl.carColor));
  const colorOrder = Object.keys(COLOR_BG);
  const colors = colorRows
    .map((r) => r.color as string)
    .filter(Boolean)
    .sort((a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b))
    .map((c) => ({ value: c, label: colorLabel(c) }));

  // Drives present (front/all/rear), BG-labelled.
  const driveRows = await db.selectDistinct({ drive: cl.driveWheel }).from(cl).where(isNotNull(cl.driveWheel));
  const drives = driveRows
    .map((r) => r.drive as string)
    .filter(Boolean)
    .map((d) => ({ value: d, label: driveLabel(d) }));

  // Years present, newest first. Clamp to a sane window — the data carries junk
  // years (0, 206, 1900, …) that would clutter the dropdown.
  // Static bounds (a `"use cache"` scope shouldn't depend on `new Date()`); bump
  // YEAR_MAX over time. Matches the filter-bar "Година до" placeholder (2027).
  const YEAR_MIN = 1980;
  const YEAR_MAX = 2027;
  const yearRows = await db
    .selectDistinct({ year: cl.carYear })
    .from(cl)
    .where(sql`${cl.carYear} BETWEEN ${YEAR_MIN} AND ${YEAR_MAX}`)
    .orderBy(sql`${cl.carYear} DESC`);
  const years = yearRows
    .map((r) => r.year as number)
    .filter((y) => Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX);

  // Combined "Тип" options: non-car vehicle_types (vt:*) + the body_types that
  // automobiles actually have (bt:*). Each with a count, ordered by frequency, so
  // the dropdown leads with the common types and surfaces boats/moto/etc too.
  const vtRows = await db
    .select({ value: cl.vehicleType, n: sql<number>`count(*)::int` })
    .from(cl)
    .where(isNotNull(cl.vehicleType))
    .groupBy(cl.vehicleType);
  const btRows = await db
    .select({ value: cl.bodyType, n: sql<number>`count(*)::int` })
    .from(cl)
    .where(and(eq(cl.vehicleType, "automobile"), isNotNull(cl.bodyType)))
    .groupBy(cl.bodyType);

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

  return { brands, modelsByBrand, colors, drives, types, years };
}
