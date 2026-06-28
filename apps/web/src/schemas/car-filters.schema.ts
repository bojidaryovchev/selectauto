import { z } from "zod";

/**
 * Validation/clamping for the catalog filters. Used by the `loadMoreCars` server
 * action to sanitize untrusted input (a Server Action is reachable by direct
 * POST), and available to the queries for defense-in-depth. The page's
 * `parseCarFilters` already drops malformed values; this additionally clamps
 * ranges and enforces enums, so the SQL never sees nonsense.
 *
 * Years are bounded to a sane window (the data spans ~1990–2026); prices are
 * non-negative. All fields optional — an empty object means "all cars".
 */
const CURRENT_YEAR = 2027; // upper bound for the year filter (matches the mockup placeholder)

export const carFiltersSchema = z.object({
  status: z.enum(["active", "past"]).optional(),
  channel: z.enum(["buy-now", "auction"]).optional(),
  market: z.enum(["us", "kr", "ca"]).optional(),
  brand: z.number().int().positive().optional(),
  model: z.number().int().positive().optional(),
  color: z.string().trim().min(1).max(40).optional(),
  drive: z.enum(["front", "all", "rear"]).optional(),
  type: z
    .string()
    .regex(/^(vt|bt):[a-z_]+$/)
    .optional(),
  yearFrom: z.number().int().min(1900).max(CURRENT_YEAR).optional(),
  yearTo: z.number().int().min(1900).max(CURRENT_YEAR).optional(),
  priceMin: z.number().min(0).max(100_000_000).optional(),
  priceMax: z.number().min(0).max(100_000_000).optional(),
  search: z.string().trim().min(1).max(64).optional(),
});

export type CarFiltersInput = z.infer<typeof carFiltersSchema>;

/**
 * Parse + clamp arbitrary input into safe CarFilters. Never throws — invalid
 * input collapses to an empty filter set (= show all cars) rather than erroring
 * the request. Also normalizes priceMin/priceMax so min ≤ max.
 */
export function safeParseCarFilters(input: unknown): CarFiltersInput {
  const result = carFiltersSchema.safeParse(input);
  if (!result.success) return {};
  const f = result.data;
  if (f.priceMin !== undefined && f.priceMax !== undefined && f.priceMin > f.priceMax) {
    [f.priceMin, f.priceMax] = [f.priceMax, f.priceMin];
  }
  if (f.yearFrom !== undefined && f.yearTo !== undefined && f.yearFrom > f.yearTo) {
    [f.yearFrom, f.yearTo] = [f.yearTo, f.yearFrom];
  }
  return f;
}
