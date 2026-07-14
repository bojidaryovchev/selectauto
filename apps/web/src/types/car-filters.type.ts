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
 * docs/05-projection-tables-car-listings.md §5). All optional — an empty object = "all cars".
 */
export type CarFilters = {
  /**
   * Active catalog vs past/sold results. undefined/"active" = the live catalog
   * (car_listings); "past" = concluded auctions (car_listings_archived), the
   * "Приключили" toggle. Drives which read model the queries hit.
   */
  status?: "active" | "past";
  /**
   * Auction-timing window (ACTIVE view only) → a sale_date range relative to the
   * request time. undefined = "Всички" (no predicate). Only ~13.5% of active cars
   * have a future sale_date, so this narrows to scheduled auctions; the windows
   * are day-scale (hour buckets are empty on real data). See
   * docs/08-web-all-cars-page.md §3.
   *  - scheduled → sale_date > now() (any future auction)
   *  - today     → … and ≤ end of today
   *  - 24h/3d/7d → … and ≤ now() + that span
   * Ignored when status === "past" (archived lots have all concluded).
   */
  auctionWindow?: "scheduled" | "today" | "24h" | "3d" | "7d";
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
   * Fuel type canonical name (gasoline/diesel/electric/hybrid/flexible/gas/
   * hydrogen); matches car_listings.fuel_type. NB: upstream 'electric' is a
   * drivetrain tag that also covers many hybrids, and 'hybrid' is a separate
   * value — the dropdown exposes the raw taxonomy (see car-labels FUEL_BG).
   */
  fuel?: string;
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
  fuels: FacetOption[];
  conditions: FacetOption[];
  /** Combined vehicle/body type options; values are `vt:*` / `bt:*` (see CarFilters.type). */
  types: FacetOption[];
  years: number[];
};

/**
 * A page of catalog results plus the opaque keyset cursors for paging in both
 * directions.
 *  - `nextCursor` — page DOWN (older, `sort_id < it`). `null` = bottom reached.
 *  - `prevCursor` — page UP (newer, `sort_id > it`). `null`/absent = top reached.
 *
 * The forward-only first paint (page 1 from the top) omits `prevCursor` (it IS
 * the top). A window seeded around a shared `?after=` pointer sets both, so the
 * grid can reverse-scroll up as well as infinite-scroll down. Cursors are the
 * boundary rows' `sort_id` as strings — see get-cars-page.query.ts.
 */
export type CarsPage = {
  cars: CarView[];
  nextCursor: string | null;
  prevCursor?: string | null;
};
