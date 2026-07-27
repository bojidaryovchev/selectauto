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
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
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
    // Card thumbnail baked at ingestion (640×416 WebP on our S3+CloudFront),
    // served `unoptimized` so the catalog grid bypasses Vercel Image
    // Optimization entirely. `thumbnailSourceUrl` records which `image_url` the
    // current thumbnail was baked from — the change-detection key: the bake
    // worker only (re)bakes when image_url differs from it (migration 0035).
    thumbnailUrl: text("thumbnail_url"),
    thumbnailSourceUrl: text("thumbnail_source_url"),
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
    // Lead lifecycle (migration 0029) — driven by the /admin inbox.
    // status: 'new' | 'contacted' | 'won' | 'lost' | 'archived'.
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("carfax_requests_created_at_idx").on(t.createdAt),
    vinIdx: index("carfax_requests_vin_idx").on(t.vin),
    statusIdx: index("carfax_requests_status_idx").on(t.status),
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
    // Renamed from budget/time/finance (migration 0025) — the old names were
    // misleading (`time` read as a timestamp). These hold free-text quiz answers.
    budgetRange: text("budget_range"),
    purchaseTimeframe: text("purchase_timeframe"),
    financingOption: text("financing_option"),
    pageUrl: text("page_url"),
    userIp: text("user_ip"),
    // Lead lifecycle (migration 0029) — driven by the /admin inbox.
    // status: 'new' | 'contacted' | 'won' | 'lost' | 'archived'.
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("inquiries_created_at_idx").on(t.createdAt),
    statusIdx: index("inquiries_status_idx").on(t.status),
  }),
);

/**
 * calculator_offers — leads from the /kalkulator gated-offer flow (Calculator
 * v2): the visitor tunes the import-cost estimator, submits name/phone/email to
 * receive the itemized breakdown by email, and the lead lands here. Website-
 * write, low-volume lead data like carfax_requests/inquiries. `breakdownJson`
 * snapshots the exact estimate the visitor saw (inputs + line items + rates
 * version). Keep in sync with migrations/0028_calculator_offers.sql.
 */
export const calculatorOffers = pgTable(
  "calculator_offers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    /** Sourcing market the estimate was for ('kr' | 'us' | 'ca'). */
    market: text("market").notNull(),
    carPriceEur: integer("car_price_eur").notNull(),
    totalEur: integer("total_eur").notNull(),
    breakdownJson: jsonb("breakdown_json").notNull(),
    pageUrl: text("page_url"),
    userIp: text("user_ip"),
    // Lead lifecycle (migration 0029) — driven by the /admin inbox.
    // status: 'new' | 'contacted' | 'won' | 'lost' | 'archived'.
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("calculator_offers_created_at_idx").on(t.createdAt),
    statusIdx: index("calculator_offers_status_idx").on(t.status),
  }),
);

/**
 * US/Canada transport tariff tables — the import calculator's inland + container
 * pricing, admin-uploadable via /admin/tarifi (parsed from the provider's
 * xlsx workbooks). Versioned: each upload is a `tariff_uploads` row; exactly one
 * is `active`, and the calculator resolves against the active version's rows.
 * A DB miss falls back to the generated static seed (data/us-transport-tariffs.ts).
 * Keep in sync with migrations/0033_transport_tariffs.sql.
 */
export const tariffUploads = pgTable(
  "tariff_uploads",
  {
    id: serial("id").primaryKey(),
    /** Original uploaded filename(s), for the audit list. */
    filename: text("filename").notNull(),
    inlandRows: integer("inland_rows").notNull(),
    containerRows: integer("container_rows").notNull(),
    note: text("note"),
    /** Exactly one upload is active; the calculator reads that version. */
    active: boolean("active").notNull().default(false),
    /** Auth.js user id of the admin who uploaded it. */
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    activeIdx: index("tariff_uploads_active_idx").on(t.active),
  }),
);

export const usInlandTariffs = pgTable(
  "us_inland_tariffs",
  {
    id: serial("id").primaryKey(),
    uploadId: integer("upload_id")
      .notNull()
      .references(() => tariffUploads.id, { onDelete: "cascade" }),
    location: text("location").notNull(),
    auction: text("auction").notNull(),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    /** Preferred (cheapest) shipping terminal for this location. */
    terminal: text("terminal").notNull(),
    /** Inland transport to that terminal, USD (incl. the +$235 markup). */
    inland: integer("inland").notNull(),
  },
  (t) => ({
    uploadIdx: index("us_inland_tariffs_upload_idx").on(t.uploadId),
  }),
);

/**
 * calculator_settings — the admin-editable calculator config (fees, commission
 * tiers, transport legs, agency, technotest, duty/VAT/FX) as one JSON blob. One
 * row per save (newest wins = active); the calculator falls back to the built-in
 * DEFAULT_CALC_CONFIG when empty. Keep in sync with migrations/0034_calculator_settings.sql.
 */
export const calculatorSettings = pgTable("calculator_settings", {
  id: serial("id").primaryKey(),
  /** A serialized `CalcConfig` (see apps/web/src/data/import-rates.ts). */
  config: jsonb("config").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usContainerPrices = pgTable(
  "us_container_prices",
  {
    id: serial("id").primaryKey(),
    uploadId: integer("upload_id")
      .notNull()
      .references(() => tariffUploads.id, { onDelete: "cascade" }),
    /** Container configuration, e.g. "4 cars in 40'HC". */
    config: text("config").notNull(),
    terminal: text("terminal").notNull(),
    /** Price per 1 car, USD (incl. the +$105 markup on 3/4-car rows). */
    price: integer("price").notNull(),
  },
  (t) => ({
    uploadIdx: index("us_container_prices_upload_idx").on(t.uploadId),
  }),
);

/**
 * vin_report_checks — read-through cache for the FREE AuctionsAPI
 * `/reports/check-records/{vin}` lookup (Carfax / AutoCheck record availability).
 * Backs the /proverka-vin tool AND the per-car "Провери история по VIN" button on
 * /avtomobil/[id].
 *
 * Unlike `"use cache"` (in-memory LRU, per-instance — does NOT persist across
 * serverless requests, see apps/web/src/lib/cache-tags.ts), this durable row dedupes
 * the lookup across all users, which is what protects the shared AuctionsAPI ~3 req/s
 * budget. The endpoint is free (no report credit), so the win is rate-limit/latency,
 * not cost. One row per VIN; the counts drift up slowly as history accrues, so rows
 * are refreshed on a TTL (`checkedAt`) by lib/vin-report-cache.ts, which also falls
 * back to a stale row when the upstream call fails. Keep in sync with
 * migrations/0032_vin_report_checks.sql.
 */
export const vinReportChecks = pgTable("vin_report_checks", {
  /** Normalized (trimmed, upper-cased) 17-char VIN — the natural key. */
  vin: text("vin").primaryKey(),
  /** Normalized vehicle description ("HONDA CR-V EX 2018"), or NULL. */
  vehicle: text("vehicle"),
  carfax: integer("carfax").notNull().default(0),
  autocheck: integer("autocheck").notNull().default(0),
  /** When the upstream lookup that produced this row last ran (the TTL clock). */
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Auth.js (NextAuth v5) tables — self-hosted auth (Google + email/password, JWT
 * sessions). Shapes for users/accounts/verificationTokens match what
 * @auth/drizzle-adapter expects (verified against its lib/pg.d.ts). JWT sessions
 * → no `sessions` table needed. Keep in sync with migrations/0019_auth.sql.
 */

/**
 * users — Auth.js user. `id` is a generated uuid string (TEXT). `passwordHash`
 * is OUR addition for the Credentials (email/password) provider — NULL for
 * Google-only users. `emailVerified` gates email/password sign-in (set when the
 * user clicks the verification link).
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  passwordHash: text("password_hash"),
  // Elevated roles granted to this account — authorises the owner-facing /admin
  // back office (migrations 0029→0031). An array so an account can hold several
  // roles (admin today; editor/… later); a normal visitor has an empty array.
  // Membership of 'admin' gates /admin. Rides on the Auth.js JWT (set in the
  // `jwt` callback from a DB read at sign-in) so /admin gating needs no per-
  // request DB lookup. RBAC-ready via the role model in src/constants/admin.ts.
  roles: text("roles").array().notNull().default([]),
  // Opt-in for the daily "любими автомобили с търг днес" email digest, set from
  // /lyubimi. Default off. See apps/web/src/queries/favorites +
  // apps/web/src/app/api/cron/favorite-auction-alerts.
  favoriteAuctionAlerts: boolean("favorite_auction_alerts").notNull().default(false),
  // The America/New_York auction DAY we last sent this user a digest for; the
  // cron skips a user already sent for today's NY day so re-runs never double-send.
  favoriteAuctionAlertSentOn: date("favorite_auction_alert_sent_on"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * accounts — OAuth provider links (Google). Adapter shape; composite PK
 * (provider, providerAccountId).
 */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    // NB: these property names are snake_case ON PURPOSE — the @auth/drizzle-adapter
    // types require the accounts table to expose exactly these keys
    // (refresh_token, access_token, expires_at, token_type, id_token,
    // session_state). Renaming them to camelCase fails the adapter's type check.
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("accounts_user_id_idx").on(t.userId)],
);

/**
 * verification_tokens — Auth.js token table; used here to verify a new
 * email/password sign-up (identifier = email). Composite PK (identifier, token).
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/**
 * password_reset_tokens — OUR forgot-password flow (Auth.js doesn't provide one
 * for Credentials). Single-use, expiring; one row per outstanding reset request.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

/**
 * favorites — user favourites (one row per user × physical car saved from the
 * website). The owner is an Auth.js user id (opaque text). `car_id` references
 * cars(id) — the stable car identity used across car_listings / CarView.id /
 * /avtomobil/[id] — so a favourite survives a lot being relisted or archived.
 * Composite PK makes the favourite a set membership (idempotent toggle, no dup).
 * Created in its current `user_id` shape by migration 0019_auth.sql (which drops
 * and recreates the original 0018 favourites table, previously keyed on the old
 * auth provider's user id). Keep in sync with 0019.
 */
export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id").notNull(),
    carId: integer("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.carId] }), index("favorites_user_idx").on(t.userId, t.createdAt)],
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
 * docs/05-projection-tables-car-listings.md §4/§7.
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
  // Denormalized from cars.fuel_type (stable — the reference sync doesn't touch
  // it). Powers the catalog "Гориво" filter single-table (migration 0020).
  fuelType: text("fuel_type"),
  imageUrl: text("image_url"),
  // Baked card thumbnail (CloudFront URL), projected from auction_lots by the
  // recompute fns. NULL until the bake worker fills it in; the card falls back
  // to the optimized `image_url` while null (migration 0035).
  thumbnailUrl: text("thumbnail_url"),
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
  fuelType: text("fuel_type"),
  imageUrl: text("image_url"),
  // Baked card thumbnail (CloudFront URL); see car_listings note above (migration 0035).
  thumbnailUrl: text("thumbnail_url"),
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
  // SET-ONCE first-seen-archived time (migration 0023). Unlike updated_at (bumped
  // every recompute), this is preserved on conflict — the stable "how long archived"
  // signal the SEO 410 proxy uses to de-index long-dead lots.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

/**
 * car_listing_counts — exact, O(1) result counts for the catalog's BROAD views
 * (market × channel × active/past, the page-level tabs). One row per dimension
 * key; maintained incrementally by recompute_*_counted(car_ids[]) via a
 * before/after snapshot-diff in the same transaction as the projection write.
 * The website's getCarsCount reads this for broad views instead of a full-table
 * COUNT(*) (a ~750k-row seq scan); narrow filters still use a live COUNT. Keep in
 * sync with migrations/0016_listing_counts.sql.
 *
 *   table_kind: 'active' | 'past'
 *   dim:        'total' | 'country' | 'channel' | 'country+channel'
 *   val:        the dimension value ('' for total; e.g. 'USA', 'buy-now',
 *               'USA|auction')
 */
export const carListingCounts = pgTable(
  "car_listing_counts",
  {
    tableKind: text("table_kind").notNull(),
    dim: text("dim").notNull(),
    val: text("val").notNull(),
    n: bigint("n", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.tableKind, t.dim, t.val] })],
);

/**
 * car_listing_facets — precomputed FACET options for the catalog filter dropdowns
 * (the values + counts behind getCarFacets). Like car_listing_counts, a tiny
 * summary table maintained INCREMENTALLY by the recompute_*_counted wrappers via a
 * before/after snapshot-diff in the same transaction as the projection write, so
 * the website reads dropdown options with one index scan instead of 8 GROUP-BY/
 * DISTINCT full-projection passes (which contended on one Neon compute → ~3s).
 *
 * Stores only dimension VALUES + counts, never brand/model NAMES (Flow 4 renames
 * without touching lots → a denormalized name would go stale; see docs/05 §5). The
 * app resolves brand/model ids → names at read time. Keep in sync with
 * migrations/0017_listing_facets.sql.
 *
 *   table_kind: 'active' | 'past'
 *   dim:        'brand'|'model'|'color'|'drive'|'condition'|'year'|'vtype'|'btype'|'fuel'
 *               ('fuel' added by migration 0020)
 *   val:        the facet value (manufacturer/model id as text for brand/model;
 *               raw string for color/drive/condition/year/vtype/btype/fuel)
 *   val2:       parent brand id for 'model' (the dropdown groups models by brand);
 *               '' for every other dimension
 */
export const carListingFacets = pgTable(
  "car_listing_facets",
  {
    tableKind: text("table_kind").notNull(),
    dim: text("dim").notNull(),
    val: text("val").notNull(),
    val2: text("val2").notNull().default(""),
    n: bigint("n", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tableKind, t.dim, t.val, t.val2] }),
    index("car_listing_facets_kind_dim_idx").on(t.tableKind, t.dim),
  ],
);

/**
 * Contracts & payments module (техническо задание "договори и плащания" — see
 * docs/contracts-payments-plan.md and migrations/0038_contracts_payments.sql,
 * keep in sync). The mediation contract is the single source of truth: client,
 * car and the five financial points are entered once; saving auto-creates the
 * four payment stages; notices are generated as immutable versioned snapshots.
 */

/**
 * clients — one row per client (физическо/юридическо лице). Gives the deposit
 * flow a client identity across contracts; every contract also freezes a
 * `client_snapshot` so later edits here never change existing documents.
 */
export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    /** 'individual' (физическо лице) | 'company' (юридическо лице). */
    kind: text("kind").notNull(),
    /** Three names or company name, depending on kind. */
    name: text("name").notNull(),
    egn: text("egn"),
    eik: text("eik"),
    vatNumber: text("vat_number"),
    address: text("address"),
    representative: text("representative"),
    phone: text("phone"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("clients_name_idx").on(t.name), index("clients_egn_idx").on(t.egn), index("clients_eik_idx").on(t.eik)],
);

/**
 * payment_recipients — the admin-managed "Получатели" settings (spec §8): the
 * bank/company details a payment notice is addressed to. Seeded with SelectAuto,
 * Auto America B.V and Lean Customs BV (migration 0038); international partners
 * are added by admins. Generation blocks while required bank fields are empty.
 */
export const paymentRecipients = pgTable(
  "payment_recipients",
  {
    id: serial("id").primaryKey(),
    /** Stable ref for built-ins ('selectauto' | 'auto_america' | 'lean_customs'); NULL for partners. */
    slug: text("slug").unique(),
    /** 'selectauto' | 'international_partner' | 'customs_broker'. */
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    country: text("country"),
    address: text("address"),
    vatNumber: text("vat_number"),
    bankName: text("bank_name"),
    bankAddress: text("bank_address"),
    iban: text("iban"),
    swiftBic: text("swift_bic"),
    /** Extra clearing code some non-SEPA wires need (e.g. Canadian routing code). */
    routingCode: text("routing_code"),
    currency: text("currency"),
    /** Разноски на превода — OUR/SHA or verbatim text ("За сметка на изпращача"). */
    chargesInstruction: text("charges_instruction"),
    /** Вид плащане shown on the notice (e.g. "BLINK" for SelectAuto). */
    paymentMethod: text("payment_method"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payment_recipients_kind_idx").on(t.kind, t.active)],
);

/**
 * contract_counters — per-series/year number minting for the two independent
 * document series ('contract' | 'deposit'). Numbers like "2026-088" are minted
 * atomically via INSERT .. ON CONFLICT .. SET last_no = last_no + 1 RETURNING.
 */
export const contractCounters = pgTable(
  "contract_counters",
  {
    series: text("series").notNull(),
    year: integer("year").notNull(),
    lastNo: integer("last_no").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.series, t.year] })],
);

/**
 * deposit_contracts — the deposit-contract module (spec §14): a preliminary
 * contract with its own lifecycle and number series. When used, the mediation
 * contract points here via `contracts.deposit_contract_id` (a UNIQUE index
 * there enforces single use; the link is NOT mirrored here to avoid a circular FK).
 */
export const depositContracts = pgTable(
  "deposit_contracts",
  {
    id: serial("id").primaryKey(),
    /** Visible number, e.g. '2026-047' (own series). */
    number: text("number").notNull().unique(),
    depositDate: date("deposit_date").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    /** Client data frozen at creation. */
    clientSnapshot: jsonb("client_snapshot").notNull(),
    /** Free-text vehicle description from чл.1 (e.g. "ЛЕК АВТОМОБИЛ"). */
    vehicleDescription: text("vehicle_description"),
    budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
    budgetCurrency: text("budget_currency").notNull().default("EUR"),
    depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }).notNull(),
    /** 'draft' | 'signed' | 'paid' | 'used' | 'returned' | 'cancelled'. */
    status: text("status").notNull().default("draft"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("deposit_contracts_client_idx").on(t.clientId, t.status),
    index("deposit_contracts_created_at_idx").on(t.createdAt),
  ],
);

/**
 * contracts — the mediation contract (договор за посредничество). One row per
 * deal; documents link by `id` (the internal key), `number` is for humans/print.
 * The five points (§3.5) live here and are entered ONCE; the four payment stages
 * are derived rows in contract_payments created in the same transaction.
 */
export const contracts = pgTable(
  "contracts",
  {
    id: serial("id").primaryKey(),
    /** Visible number, e.g. '2026-088'. */
    number: text("number").notNull().unique(),
    contractDate: date("contract_date").notNull(),
    /**
     * 'us' | 'ca' | 'kr' | 'eu' — drives the document type, the currency, the
     * list of пера and how many payment stages exist (migration 0041; the
     * definitions live in apps/web/src/constants/contracts.ts).
     */
    market: text("market").notNull(),
    currency: text("currency").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    clientSnapshot: jsonb("client_snapshot").notNull(),
    carYear: integer("car_year"),
    carMake: text("car_make"),
    carModel: text("car_model"),
    vin: text("vin"),
    purchaseMarket: text("purchase_market"),
    auctionPlatform: text("auction_platform"),
    // The five financial points (§3.5). NUMERIC → string in selects (money-safe).
    amountCar: numeric("amount_car", { precision: 12, scale: 2 }).notNull().default("0"),
    amountTransport: numeric("amount_transport", { precision: 12, scale: 2 }).notNull().default("0"),
    amountCustomsVat: numeric("amount_customs_vat", { precision: 12, scale: 2 }).notNull().default("0"),
    amountTransportEuBg: numeric("amount_transport_eu_bg", { precision: 12, scale: 2 }).notNull().default("0"),
    amountCommission: numeric("amount_commission", { precision: 12, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    // Канада: перо 1 is wired in CAD; amountCar holds its EUR equivalent (the
    // contract's leading amount) computed with foreignRate at creation (0041).
    amountCarForeign: numeric("amount_car_foreign", { precision: 12, scale: 2 }),
    foreignCurrency: text("foreign_currency"),
    foreignRate: numeric("foreign_rate", { precision: 12, scale: 6 }),
    /** Основание за плащане; defaults to "Договор № {number}" at creation. */
    paymentBasis: text("payment_basis"),
    /** Set when an active deposit is applied to payment 1 (§14); UNIQUE partial index = single use. */
    depositContractId: integer("deposit_contract_id").references(() => depositContracts.id),
    depositDeduction: numeric("deposit_deduction", { precision: 12, scale: 2 }).notNull().default("0"),
    /** 'draft' | 'active' | 'fully_paid' | 'cancelled'. */
    status: text("status").notNull().default("active"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("contracts_deposit_contract_ux")
      .on(t.depositContractId)
      .where(sql`deposit_contract_id IS NOT NULL`),
    index("contracts_client_idx").on(t.clientId),
    index("contracts_status_idx").on(t.status),
    index("contracts_created_at_idx").on(t.createdAt),
    index("contracts_vin_idx").on(t.vin),
  ],
);

/**
 * contract_payments — exactly four stage rows per contract (Кола, Транспорт,
 * Мито и ДДС, Финално = т.4 + т.5), auto-created on contract save (§4). The
 * recipient is validated per stage (§5): vehicle/transport → selectauto or
 * international_partner; customs_vat → auto_america/lean_customs; final →
 * always selectauto. remaining = due_amount − paid_amount (computed, not stored).
 */
export const contractPayments = pgTable(
  "contract_payments",
  {
    id: serial("id").primaryKey(),
    contractId: integer("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    /** 'vehicle' (т.1) | 'transport' (т.2) | 'customs_vat' (т.3) | 'final' (т.4+т.5). */
    stage: text("stage").notNull(),
    dueAmount: numeric("due_amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    recipientId: integer("recipient_id").references(() => paymentRecipients.id),
    /** Per-stage основание (customs operations get their own reference — §5.3). */
    basis: text("basis"),
    dueDate: date("due_date"),
    /** 'not_requested' | 'awaiting_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'. */
    status: text("status").notNull().default("not_requested"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAt: date("paid_at"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("contract_payments_contract_id_stage_key").on(t.contractId, t.stage),
    index("contract_payments_status_idx").on(t.status),
  ],
);

/**
 * generated_documents — append-only, versioned generated PDFs: payment notices
 * plus the contract/deposit-contract documents themselves. `snapshot` freezes
 * the COMPLETE render payload at generation time (§2 — a contract edit or
 * recipient edit never changes an already generated document); regeneration
 * inserts version+1, nothing is overwritten or deleted (§9). The USD columns
 * snapshot the §16 conversion (us_ca notices to SelectAuto only).
 */
export const generatedDocuments = pgTable(
  "generated_documents",
  {
    id: serial("id").primaryKey(),
    /** 'payment_notice' | 'contract' | 'deposit_contract'. */
    kind: text("kind").notNull(),
    contractId: integer("contract_id").references(() => contracts.id),
    paymentId: integer("payment_id").references(() => contractPayments.id),
    depositContractId: integer("deposit_contract_id").references(() => depositContracts.id),
    version: integer("version").notNull(),
    recipientId: integer("recipient_id").references(() => paymentRecipients.id),
    snapshot: jsonb("snapshot").notNull(),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }),
    usdEurRate: numeric("usd_eur_rate", { precision: 12, scale: 6 }),
    amountEur: numeric("amount_eur", { precision: 12, scale: 2 }),
    pdfS3Key: text("pdf_s3_key"),
    generatedBy: text("generated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("generated_documents_payment_version_ux")
      .on(t.paymentId, t.version)
      .where(sql`payment_id IS NOT NULL`),
    uniqueIndex("generated_documents_deposit_version_ux")
      .on(t.depositContractId, t.version)
      .where(sql`deposit_contract_id IS NOT NULL AND kind = 'deposit_contract'`),
    uniqueIndex("generated_documents_contract_version_ux")
      .on(t.contractId, t.kind, t.version)
      .where(sql`contract_id IS NOT NULL AND payment_id IS NULL`),
    index("generated_documents_contract_idx").on(t.contractId),
  ],
);

/**
 * payment_attachments — uploaded proof-of-payment files per payment stage
 * (платежни документи, §4.3). Binary lives in the private documents S3 bucket;
 * this row is the metadata + key.
 */
export const paymentAttachments = pgTable(
  "payment_attachments",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => contractPayments.id, { onDelete: "cascade" }),
    s3Key: text("s3_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payment_attachments_payment_idx").on(t.paymentId)],
);

/**
 * contract_events — append-only audit trail for the module (§9): who created/
 * edited what, status changes, generated versions, mark-paid actions. Written in
 * the same transaction as the mutation it records. Never updated or deleted.
 */
export const contractEvents = pgTable(
  "contract_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** 'contract' | 'payment' | 'deposit' | 'recipient' | 'client'. */
    entity: text("entity").notNull(),
    entityId: integer("entity_id").notNull(),
    /** e.g. 'created' | 'updated' | 'status_changed' | 'document_generated' | 'marked_paid'. */
    action: text("action").notNull(),
    actorId: text("actor_id"),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("contract_events_entity_idx").on(t.entity, t.entityId, t.createdAt)],
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
export type CarfaxRequest = typeof carfaxRequests.$inferSelect;
export type NewCarfaxRequest = typeof carfaxRequests.$inferInsert;
export type CarListingCount = typeof carListingCounts.$inferSelect;
export type CarListingFacet = typeof carListingFacets.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
export type CalculatorOffer = typeof calculatorOffers.$inferSelect;
export type NewCalculatorOffer = typeof calculatorOffers.$inferInsert;
export type VinReportCheck = typeof vinReportChecks.$inferSelect;
export type NewVinReportCheck = typeof vinReportChecks.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type CarListing = typeof carListings.$inferSelect;
export type NewCarListing = typeof carListings.$inferInsert;
export type CarListingArchived = typeof carListingsArchived.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type PaymentRecipient = typeof paymentRecipients.$inferSelect;
export type NewPaymentRecipient = typeof paymentRecipients.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type ContractPayment = typeof contractPayments.$inferSelect;
export type NewContractPayment = typeof contractPayments.$inferInsert;
export type DepositContract = typeof depositContracts.$inferSelect;
export type NewDepositContract = typeof depositContracts.$inferInsert;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
export type PaymentAttachment = typeof paymentAttachments.$inferSelect;
export type ContractEvent = typeof contractEvents.$inferSelect;
export type NewContractEvent = typeof contractEvents.$inferInsert;
