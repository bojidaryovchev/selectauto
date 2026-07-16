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
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
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
  (t) => [
    primaryKey({ columns: [t.userId, t.carId] }),
    index("favorites_user_idx").on(t.userId, t.createdAt),
  ],
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
