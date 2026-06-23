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
    bidPrice: bigint("bid_price", { mode: "number" }),
    buyNowPrice: bigint("buy_now_price", { mode: "number" }),
    finalBid: bigint("final_bid", { mode: "number" }),
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

// Inferred types for use in queries elsewhere in the app.
export type Car = typeof cars.$inferSelect;
export type NewCar = typeof cars.$inferInsert;
export type AuctionLot = typeof auctionLots.$inferSelect;
export type NewAuctionLot = typeof auctionLots.$inferInsert;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type VehicleModel = typeof vehicleModels.$inferSelect;
export type VehicleGeneration = typeof vehicleGenerations.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
