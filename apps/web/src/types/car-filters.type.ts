/**
 * Types for the /vsichki-avtomobili catalog: the parsed filter state, the facet
 * options that populate the dropdowns/tabs, and a page of results with its
 * keyset cursor. Filters are serialized to/from the URL (see `@/lib/car-filters`)
 * and validated with `@/schemas/car-filters.schema`.
 */
import type { CarView } from "./car.type";

/**
 * The user's current filter selection. Mirrors the legacy `[mixed_cars_grid]`
 * filter set; every field maps 1:1 to a `car_listings` column (see
 * apps/web/ALL-CARS-DB-DESIGN.md §5). All optional — an empty object = "all cars".
 */
export type CarFilters = {
  /**
   * Active catalog vs past/sold results. undefined/"active" = the live catalog
   * (car_listings); "past" = concluded auctions (car_listings_archived), the
   * "Приключили" toggle. Drives which read model the queries hit.
   */
  status?: "active" | "past";
  /** Channel tab/toggle → buy_now predicate. undefined = "Всички". */
  channel?: "buy-now" | "auction";
  /** Market segmented control → location_country (us=USA, kr=kr, ca=Canada). */
  market?: "us" | "kr" | "ca";
  /** Manufacturer external id (matches manufacturers.external_id). */
  brand?: number;
  /** Model external id (matches vehicle_models.external_id); brand-scoped. */
  model?: number;
  /** Color canonical name (white/black/…); matches car_listings.car_color. */
  color?: string;
  /** Drivetrain canonical name (front/all/rear). */
  drive?: string;
  /**
   * Condition: one or more canonical raws, comma-joined. Some BG labels cover
   * several raws (e.g. `run_and_drives,engine_starts` → "Пали и се движи"), so the
   * facet value is the whole set and the query matches with IN(...).
   */
  condition?: string;
  /**
   * Combined vehicle/body type, prefixed to pick the column:
   *  - `vt:<value>` → vehicle_type (non-car categories: boat/truck/moto/…)
   *  - `bt:<value>` → body_type (car sub-shapes: suv/sedan/pickup/…)
   * One dropdown, two columns. Built by getCarFacets.
   */
  type?: string;
  /** Year range on car_year ("Година от"/"Година до", inclusive). */
  yearFrom?: number;
  yearTo?: number;
  /** Price range on effective_price (USD). */
  priceMin?: number;
  priceMax?: number;
  /** Lot-number prefix OR exact VIN search (a lookup, not a paged feed). */
  search?: string;
};

/** One option in a filter dropdown: the canonical value + its display label. */
export type FacetOption = {
  /** Canonical value sent back in the URL/filters (id or enum name). */
  value: string;
  /** BG/human label shown in the dropdown. */
  label: string;
  /** Optional count (cars matching) — shown when available. */
  count?: number;
};

/**
 * The options that populate the filter UI. Brands/models come from the
 * reference tables; colors/years from DISTINCT over car_listings. modelsByBrand
 * is keyed by brand value (external id as string) so the model dropdown can be
 * filtered to the selected brand client-side (or lazy-loaded).
 */
export type FacetOptions = {
  brands: FacetOption[];
  modelsByBrand: Record<string, FacetOption[]>;
  colors: FacetOption[];
  drives: FacetOption[];
  conditions: FacetOption[];
  /** Combined vehicle/body type options; values are `vt:*` / `bt:*` (see CarFilters.type). */
  types: FacetOption[];
  years: number[];
};

/**
 * A page of catalog results plus the opaque keyset cursor for the next page.
 * `nextCursor === null` means there are no more results (stop infinite scroll).
 */
export type CarsPage = {
  cars: CarView[];
  nextCursor: string | null;
};
