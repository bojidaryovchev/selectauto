/**
 * Drizzle ORM schema for the AuctionsAPI ingestion database (Neon Postgres).
 *
 * This schema is the source of truth for table SHAPE and typed queries used by
 * the website/backend. The actual table CREATION in production is driven by the
 * plain SQL migration in `db/migrations/0001_initial.sql` so that no Drizzle
 * migration runner needs to ship inside Lambda. Keep the two in sync.
 *
 * Field mapping decisions are documented in `functions/shared/normalize.ts`.
 * Every record stores `raw_json` so we can reprocess/backfill new columns later
 * without re-pulling from AuctionsAPI.
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * cars
 * One row per distinct vehicle. The AuctionsAPI `/api/cars` record IS the car;
 * its nested `lots[]` array is split into `auction_lots`.
 */
export const cars = pgTable(
  "cars",
  {
    id: serial("id").primaryKey(),
    // AuctionsAPI car `id` (e.g. 267). May not be globally unique forever, but
    // it is the best stable car key we have. See fallback note in README.
    externalCarId: bigint("external_car_id", { mode: "number" }),
    vin: text("vin"),
    title: text("title"),
    year: integer("year"),
    // These store the AuctionsAPI *external* numeric ids (manufacturer.id, etc.),
    // NOT our local serial PKs. Joins to reference tables go via *_external_id.
    manufacturerId: bigint("manufacturer_id", { mode: "number" }),
    modelId: bigint("model_id", { mode: "number" }),
    generationId: bigint("generation_id", { mode: "number" }),
    bodyType: text("body_type"),
    vehicleType: text("vehicle_type"),
    color: text("color"),
    fuelType: text("fuel_type"),
    transmission: text("transmission"),
    driveWheel: text("drive_wheel"),
    engine: text("engine"),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // Unique when external_car_id is present. Postgres treats NULLs as distinct,
    // so rows with a NULL external_car_id are allowed (fallback path).
    externalCarIdUx: uniqueIndex("cars_external_car_id_ux").on(t.externalCarId),
    vinIdx: index("cars_vin_idx").on(t.vin),
  }),
);

/**
 * auction_lots
 * One row per lot listing. Uniquely identified by (domain_id, lot_number),
 * which is reliable even when external ids/VIN are missing.
 */
export const auctionLots = pgTable(
  "auction_lots",
  {
    id: serial("id").primaryKey(),
    externalLotId: bigint("external_lot_id", { mode: "number" }),
    carId: integer("car_id").references(() => cars.id, { onDelete: "set null" }),
    lotNumber: text("lot_number").notNull(),
    domainId: integer("domain_id").notNull(),
    domainName: text("domain_name"),
    status: text("status"),
    saleDate: timestamp("sale_date", { withTimezone: true }),
    // BIGINT, not INTEGER: AuctionsAPI sometimes returns odometer values far
    // above the INT max (2,147,483,647) — e.g. garbage/sentinel readings like
    // 2553571660 — which overflow a plain integer column.
    odometerKm: bigint("odometer_km", { mode: "number" }),
    // NUMERIC, not BIGINT: AuctionsAPI sends FRACTIONAL prices (e.g. 15530.14,
    // and even 51928.1213) which overflow/reject an integer column. precision 14
    // / scale 4 covers any vehicle price without truncation. Drizzle returns
    // NUMERIC as a string in selects (correct for money — no float rounding);
    // the ingestion path uses raw pg and passes JS numbers, which pg serializes
    // fine into NUMERIC.
    bidPrice: numeric("bid_price", { precision: 14, scale: 4 }),
    buyNowPrice: numeric("buy_now_price", { precision: 14, scale: 4 }),
    finalBid: numeric("final_bid", { precision: 14, scale: 4 }),
    buyNow: boolean("buy_now"),
    condition: text("condition"),
    damageMain: text("damage_main"),
    seller: text("seller"),
    locationCountry: text("location_country"),
    locationState: text("location_state"),
    locationCity: text("location_city"),
    imageUrl: text("image_url"),
    archived: boolean("archived").default(false).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    domainLotUx: uniqueIndex("auction_lots_domain_lot_ux").on(t.domainId, t.lotNumber),
    carIdIdx: index("auction_lots_car_id_idx").on(t.carId),
    statusIdx: index("auction_lots_status_idx").on(t.status),
    archivedIdx: index("auction_lots_archived_idx").on(t.archived),
  }),
);

/**
 * manufacturers — reference data from /api/manufacturers/cars
 */
export const manufacturers = pgTable(
  "manufacturers",
  {
    id: serial("id").primaryKey(),
    externalId: bigint("external_id", { mode: "number" }).notNull(),
    name: text("name"),
    imageUrl: text("image_url"),
    carsQty: integer("cars_qty"),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    externalIdUx: uniqueIndex("manufacturers_external_id_ux").on(t.externalId),
  }),
);

/**
 * vehicle_models — reference data from /api/models/{manufacturer_id}/cars
 */
export const vehicleModels = pgTable(
  "vehicle_models",
  {
    id: serial("id").primaryKey(),
    externalId: bigint("external_id", { mode: "number" }).notNull(),
    manufacturerExternalId: bigint("manufacturer_external_id", { mode: "number" }),
    name: text("name"),
    imageUrl: text("image_url"),
    carsQty: integer("cars_qty"),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    externalIdUx: uniqueIndex("vehicle_models_external_id_ux").on(t.externalId),
    manufacturerIdx: index("vehicle_models_manufacturer_idx").on(t.manufacturerExternalId),
  }),
);

/**
 * vehicle_generations — reference data from /api/generations/{model_id}/cars
 */
export const vehicleGenerations = pgTable(
  "vehicle_generations",
  {
    id: serial("id").primaryKey(),
    externalId: bigint("external_id", { mode: "number" }).notNull(),
    modelExternalId: bigint("model_external_id", { mode: "number" }),
    name: text("name"),
    fromYear: integer("from_year"),
    toYear: integer("to_year"),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    externalIdUx: uniqueIndex("vehicle_generations_external_id_ux").on(t.externalId),
    modelIdx: index("vehicle_generations_model_idx").on(t.modelExternalId),
  }),
);

/**
 * sync_runs — one row per Step Function / Lambda sync execution. Used for
 * observability, idempotency, and (conceptually) resume/checkpointing via
 * last_page_processed.
 */
export const syncRuns = pgTable(
  "sync_runs",
  {
    id: serial("id").primaryKey(),
    flowType: text("flow_type").notNull(), // e.g. 'full_backfill' | 'hourly_cars' | 'archived_lots' | 'reference' | 'detail_refresh'
    status: text("status").notNull(), // 'running' | 'succeeded' | 'failed'
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    pagesProcessed: integer("pages_processed").default(0).notNull(),
    lastPageProcessed: integer("last_page_processed").default(0).notNull(),
    // BIGINT: a long-lived / large backfill can accumulate more than INT-max records.
    recordsProcessed: bigint("records_processed", { mode: "number" }).default(0).notNull(),
    errorMessage: text("error_message"),
    metadataJson: jsonb("metadata_json"),
  },
  (t) => ({
    flowStatusIdx: index("sync_runs_flow_status_idx").on(t.flowType, t.status),
  }),
);

/**
 * carfax_requests — Carfax check inquiries submitted from the website's
 * /carfax page. Ported from the old WordPress `wp_sa_carfax_requests` table
 * (theme functions.php). One row per form submission. Unlike the ingestion
 * tables this is website-write, low-volume lead data — no raw_json/upsert keys.
 */
export const carfaxRequests = pgTable(
  "carfax_requests",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    vin: text("vin").notNull(),
    carMake: text("car_make"),
    carModel: text("car_model"),
    message: text("message"),
    pageUrl: text("page_url"),
    userIp: text("user_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("carfax_requests_created_at_idx").on(t.createdAt),
    vinIdx: index("carfax_requests_vin_idx").on(t.vin),
  }),
);

/**
 * inquiries — "Безплатна консултация" leads submitted from the website's
 * inquiry modal (the multi-step quiz in the old theme's footer). One row per
 * submission. Like carfax_requests this is website-write, low-volume lead data
 * (no raw_json/upsert keys). Only name + phone are required; the quiz answers
 * are optional because the user can skip the model/brand branch.
 */
export const inquiries = pgTable(
  "inquiries",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    specificModel: text("specific_model"),
    brand: text("brand"),
    model: text("model"),
    budget: text("budget"),
    time: text("time"),
    finance: text("finance"),
    pageUrl: text("page_url"),
    userIp: text("user_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("inquiries_created_at_idx").on(t.createdAt),
  }),
);

/**
 * car_listings — read model for the /всички-автомобили page. ONE row per
 * physical car that has at least one active, image-bearing lot: a pre-joined,
 * pre-deduped, pre-computed projection of (cars + its chosen auction_lots row).
 * The page filters/sorts/paginates this table SINGLE-TABLE with zero joins and
 * no query-time DISTINCT (the GROUP BY car_id collapse times out on the live
 * 1M-row set). Maintained incrementally by ingestion via
 * recompute_car_listings(car_ids[]) — NOT a Postgres MATERIALIZED VIEW.
 *
 * Keep in sync with migrations/0006_car_listings.sql. Indexes are created
 * post-backfill (a later migration), so none are declared here yet.
 * Brand/model NAMES are intentionally absent (resolved by id at read time —
 * the daily reference sync can change them without touching a lot). See
 * apps/web/ALL-CARS-DB-DESIGN.md §4/§7.
 */
export const carListings = pgTable("car_listings", {
  carId: integer("car_id")
    .primaryKey()
    .references(() => cars.id, { onDelete: "cascade" }),
  lotId: integer("lot_id")
    .notNull()
    .references(() => auctionLots.id, { onDelete: "cascade" }),

  // filter columns
  manufacturerId: bigint("manufacturer_id", { mode: "number" }),
  modelId: bigint("model_id", { mode: "number" }),
  carYear: integer("car_year"),
  carColor: text("car_color"),
  driveWheel: text("drive_wheel"),
  vehicleType: text("vehicle_type"),
  bodyType: text("body_type"),
  buyNow: boolean("buy_now"),
  domainName: text("domain_name"),
  locationCountry: text("location_country"),
  lotNumber: text("lot_number"),
  vin: text("vin"),
  effectivePrice: numeric("effective_price", { precision: 14, scale: 4 }),

  // sort key (chosen lot id) → keyset cursor + newest-first ordering
  sortId: integer("sort_id").notNull(),

  // display columns
  title: text("title"),
  engine: text("engine"),
  imageUrl: text("image_url"),
  odometerKm: bigint("odometer_km", { mode: "number" }),
  saleDate: timestamp("sale_date", { withTimezone: true }),
  status: text("status"),
  condition: text("condition"),
  damageMain: text("damage_main"),
  seller: text("seller"),
  transmission: text("transmission"),
  buyNowPrice: numeric("buy_now_price", { precision: 14, scale: 4 }),
  bidPrice: numeric("bid_price", { precision: 14, scale: 4 }),
  finalBid: numeric("final_bid", { precision: 14, scale: 4 }),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * car_listings_archived — read model for the PAST/SOLD listings view (the
 * "Приключили" toggle). Same shape as car_listings but for archived lots: one
 * row per physical car whose lots have concluded, for auction-result/price
 * browsing. Maintained by recompute_archived_car_listings(car_ids[]) from the
 * hourly /archived-lots sync. Keep in sync with migrations/0010_*.sql.
 */
export const carListingsArchived = pgTable("car_listings_archived", {
  carId: integer("car_id")
    .primaryKey()
    .references(() => cars.id, { onDelete: "cascade" }),
  lotId: integer("lot_id")
    .notNull()
    .references(() => auctionLots.id, { onDelete: "cascade" }),
  manufacturerId: bigint("manufacturer_id", { mode: "number" }),
  modelId: bigint("model_id", { mode: "number" }),
  carYear: integer("car_year"),
  carColor: text("car_color"),
  driveWheel: text("drive_wheel"),
  vehicleType: text("vehicle_type"),
  bodyType: text("body_type"),
  buyNow: boolean("buy_now"),
  domainName: text("domain_name"),
  locationCountry: text("location_country"),
  lotNumber: text("lot_number"),
  vin: text("vin"),
  effectivePrice: numeric("effective_price", { precision: 14, scale: 4 }),
  sortId: integer("sort_id").notNull(),
  title: text("title"),
  engine: text("engine"),
  imageUrl: text("image_url"),
  odometerKm: bigint("odometer_km", { mode: "number" }),
  saleDate: timestamp("sale_date", { withTimezone: true }),
  status: text("status"),
  condition: text("condition"),
  damageMain: text("damage_main"),
  seller: text("seller"),
  transmission: text("transmission"),
  buyNowPrice: numeric("buy_now_price", { precision: 14, scale: 4 }),
  bidPrice: numeric("bid_price", { precision: 14, scale: 4 }),
  finalBid: numeric("final_bid", { precision: 14, scale: 4 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Inferred types for use in queries elsewhere in the app.
export type Car = typeof cars.$inferSelect;
export type NewCar = typeof cars.$inferInsert;
export type AuctionLot = typeof auctionLots.$inferSelect;
export type NewAuctionLot = typeof auctionLots.$inferInsert;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type VehicleModel = typeof vehicleModels.$inferSelect;
export type VehicleGeneration = typeof vehicleGenerations.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
export type CarfaxRequest = typeof carfaxRequests.$inferSelect;
export type NewCarfaxRequest = typeof carfaxRequests.$inferInsert;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
export type CarListing = typeof carListings.$inferSelect;
export type NewCarListing = typeof carListings.$inferInsert;
export type CarListingArchived = typeof carListingsArchived.$inferSelect;
