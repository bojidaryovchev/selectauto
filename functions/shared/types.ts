/**
 * Shared TypeScript types for the AuctionsAPI ingestion system.
 *
 * The "Api*" types model the raw AuctionsAPI payloads. They are derived from a
 * real sample `/api/cars` record (see README "Sample payload"). Fields that we
 * have NOT seen documented are marked optional and carry TODO comments. We never
 * rely on a field being present; the normalize layer treats everything as
 * best-effort and always keeps `raw_json`.
 *
 * The "*Input"/"*Output" types model Lambda <-> Step Functions message shapes.
 */

/* ===========================================================================
 * AuctionsAPI raw payload shapes (best-effort, based on observed sample)
 * ======================================================================== */

/** Common `{ id, name }` lookup object used throughout AuctionsAPI. */
export interface ApiNamedRef {
  id?: number | null;
  name?: string | null;
}

/** Manufacturer ref is just `{ id, name }`; aliased for readable field types. */
export type ApiManufacturerRef = ApiNamedRef;
export interface ApiModelRef extends ApiNamedRef {
  manufacturer_id?: number | null;
}
export interface ApiGenerationRef extends ApiNamedRef {
  manufacturer_id?: number | null;
  model_id?: number | null;
}

export interface ApiOdometer {
  km?: number | null;
  mi?: number | null;
  status?: ApiNamedRef | null;
}

export interface ApiDamage {
  main?: ApiNamedRef | null;
  second?: ApiNamedRef | null;
}

export interface ApiLocation {
  country?: { iso?: string | null; name?: string | null } | null;
  state?: { id?: number | null; code?: string | null; name?: string | null } | null;
  city?: ApiNamedRef | null;
  // Other observed fields (latitude, longitude, postal_code, ...) are retained
  // only in raw_json. Add typed fields here if/when we map them.
  [key: string]: unknown;
}

export interface ApiImages {
  // The CDN-hosted, stable copies we prefer for image_url.
  downloaded?: string[] | null;
  normal?: string[] | null;
  big?: string[] | null;
  [key: string]: unknown;
}

/** A single auction lot, as nested inside an AuctionsAPI car record. */
export interface ApiLot {
  id?: number | null; // -> auction_lots.external_lot_id
  lot?: string | number | null; // -> auction_lots.lot_number
  external_id?: string | null;
  domain?: ApiNamedRef | null; // -> domain_id / domain_name
  odometer?: ApiOdometer | null;
  sale_date?: string | null;
  bid?: number | null; // -> bid_price (TODO: confirm units/currency)
  buy_now?: number | null; // observed as 0; see normalize TODO (price vs flag)
  final_bid?: number | null;
  status?: ApiNamedRef | null; // -> status (e.g. "sale")
  seller?: { name?: string | null; [k: string]: unknown } | null;
  condition?: ApiNamedRef | null;
  damage?: ApiDamage | null;
  images?: ApiImages | null;
  location?: ApiLocation | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Many more observed fields (seller_type, title, detailed_title, airbags,
  // grade_iaai, selling_branch, auction_type, ...) are retained in raw_json.
  [key: string]: unknown;
}

/**
 * A car record from `/api/cars` (and the detail endpoints, which return the same
 * car+lots shape). NOTE: `/api/archived-lots` does NOT use this shape — it
 * returns flat `ApiArchivedLot` records (see below).
 */
export interface ApiCar {
  id?: number | null; // -> cars.external_car_id
  year?: number | null;
  title?: string | null;
  vin?: string | null;
  manufacturer?: ApiManufacturerRef | null;
  model?: ApiModelRef | null;
  generation?: ApiGenerationRef | null;
  body_type?: ApiNamedRef | null;
  color?: ApiNamedRef | null;
  engine?: ApiNamedRef | null; // -> cars.engine = engine.name
  transmission?: ApiNamedRef | null;
  drive_wheel?: ApiNamedRef | null;
  vehicle_type?: ApiNamedRef | null;
  fuel?: ApiNamedRef | null; // -> cars.fuel_type = fuel.name
  cylinders?: number | null;
  lots?: ApiLot[] | null;
  [key: string]: unknown;
}

/**
 * Archived-lot record from `/api/archived-lots`. CONFIRMED against the live API
 * (2026-06). NOTE: this is a FLAT shape, NOT the car+nested-lots shape used by
 * `/api/cars`. bid/buy_now/sale_date/final_bid are {value, updated_at} objects.
 *
 * Example:
 *   { "archived_at":"2024-03-19T14:40:10Z", "lot_id":1, "car_id":1,
 *     "vin":"5uxkr0c52e0c26684", "lot":"67283833",
 *     "domain":{"name":"copart_com","id":3}, "status":{"name":"sold","id":6},
 *     "bid":{"value":8300,"updated_at":null}, "buy_now":{"value":8500,...},
 *     "sale_date":{"value":"2023-10-23T14:00:00Z","updated_at":null},
 *     "final_bid":{"value":null,"updated_at":null} }
 */
export interface ApiValueWrapper<T> {
  value?: T | null;
  updated_at?: string | null;
}
export interface ApiArchivedLot {
  archived_at?: string | null;
  lot_id?: number | null;
  car_id?: number | null;
  vin?: string | null;
  lot?: string | number | null;
  domain?: ApiNamedRef | null;
  status?: ApiNamedRef | null;
  bid?: ApiValueWrapper<number> | null;
  buy_now?: ApiValueWrapper<number> | null;
  sale_date?: ApiValueWrapper<string> | null;
  final_bid?: ApiValueWrapper<number> | null;
  [key: string]: unknown;
}

/**
 * Reference data shapes. CONFIRMED against the live API (2026-06).
 *
 * /api/manufacturers/cars -> { id, name, cars_qty, image, models_qty, cars, motorcycles }
 * /api/models/{mfg}/cars  -> { id, name, cars_qty, manufacturer_id, generations_qty, vehicle_type }
 * /api/generations/{model}/cars -> { id, name, cars_qty, from_year, to_year, manufacturer_id, model_id }
 */
export interface ApiManufacturer extends ApiNamedRef {
  cars_qty?: number | null;
  image?: string | null;
  models_qty?: number | null;
  [key: string]: unknown;
}
export interface ApiModel extends ApiNamedRef {
  manufacturer_id?: number | null;
  cars_qty?: number | null;
  generations_qty?: number | null;
  vehicle_type?: ApiNamedRef | null;
  [key: string]: unknown;
}
export interface ApiGeneration extends ApiNamedRef {
  model_id?: number | null;
  manufacturer_id?: number | null;
  cars_qty?: number | null;
  from_year?: number | null;
  to_year?: number | null;
  [key: string]: unknown;
}

/* ===========================================================================
 * Normalized pagination envelope (produced by auctionsApiClient)
 * ======================================================================== */

/**
 * Whatever wrapper AuctionsAPI uses, the client flattens it to this. It supports
 * BOTH metadata-based pagination (Laravel-style meta with last_page) AND the
 * simple "empty array => stop" fallback.
 */
export interface NormalizedPage<T> {
  data: T[];
  currentPage: number;
  /** null when unknown or when there is no next page. */
  nextPage: number | null;
  /** null when the API does not return total page count. */
  lastPage: number | null;
  hasNextPage: boolean;
  /** Raw upstream pagination wrapper (meta/links/total), kept for debugging. */
  rawMeta?: unknown;
}

/* ===========================================================================
 * Lambda <-> Step Functions message types
 * ======================================================================== */

export type FlowType = "full_backfill" | "hourly_cars" | "archived_lots" | "reference" | "detail_refresh";

/** Mode distinguishes a full backfill from an incremental (minutes-windowed) sync. */
export type SyncMode = "full" | "incremental";

/** Input passed into the paginated state machine and threaded between states. */
export interface PaginatedSyncState {
  flowType: FlowType;
  mode: SyncMode;
  page: number;
  perPage: number;
  /**
   * Incremental window in minutes (e.g. 75). For the full backfill there is no
   * window; InitSyncRun normalizes this to `null` so the value is always present
   * in the state (the Step Functions IncrementPage Pass reads `$.minutes`).
   */
  minutes?: number | null;
  /** Set by InitSyncRun; threaded so every step can update the same run row. */
  syncRunId?: number;
  /** Carried for observability/checkpointing. */
  lastPageProcessed?: number;
  pagesProcessed?: number;
  recordsProcessed?: number;
}

/**
 * Output of a merged sync-page step (fetch + write in ONE Lambda).
 *
 * Critically, this does NOT carry the page's records. A page of 1000 cars with
 * full lots/images exceeds Lambda's 6 MB response limit and Step Functions'
 * 256 KB state limit, so the data must never leave the Lambda. We only return
 * small loop-control + counter fields that thread back into the state machine.
 */
export interface SyncPageOutput extends PaginatedSyncState {
  hasNextPage: boolean;
  nextPage: number | null;
  lastPage: number | null;
  /** Records (lots) written on this page. */
  upsertedThisPage: number;
  /** Records returned by the API for this page (for observability). */
  itemCount: number;
}

/** Input to the single-listing detail refresh Lambda. */
export interface RefreshListingInput {
  /** Provide EITHER (lot + domain) OR vin. */
  lot?: string;
  domain?: string;
  vin?: string;
  pricesHistory?: boolean; // -> ?prices_history=1
}

/** Input to the reference data sync Lambda. */
export interface ReferenceSyncInput {
  /** When true, refetch even if reference rows already exist. */
  force?: boolean;
  /** Optionally limit how many manufacturers to expand into models/generations. */
  maxManufacturers?: number;
}
