import type { CarView } from "./car.type";

/**
 * View-model for the single-car detail page (`/avtomobil/[id]`). Unlike `CarView`
 * (the listing CARD projection, sourced from the lean `car_listings` row), this is
 * the FULL picture: the card fields plus everything that only lives in the lot's
 * `raw_json` (the whole image gallery, the extra appraisal prices, branch/keys/
 * airbags/titles/grade, …). Built by `carDetailFromRows` (`@/lib/car-detail-mapper`)
 * from the `cars` + chosen `auction_lots` rows, with raw_json parsed once.
 *
 * Every rich field is optional: AuctionsAPI fills them unevenly per source
 * (IAAI carries grade/branch/titles; Copart leans sparse), so the page renders
 * each row only when present. The page is server-rendered; the gallery is the one
 * interactive (client) child.
 */
export type CarDetailPrice = {
  /** BG label for the price row ("Купи сега", "Текуща цена", "Продаден за", …). */
  label: string;
  /** Pre-formatted amount ("16 743 $"). */
  value: string;
  /** Emphasize as the primary/CTA price (buy-now or realized sale price). */
  primary?: boolean;
};

/** One labelled spec row in the detail spec sheet. */
export type CarDetailSpec = {
  label: string;
  value: string;
};

export type CarDetail = {
  /** car_listings.car_id — the route param + canonical key. */
  id: number;

  // ── Identity / heading ──
  title: string;
  /** Resolved brand name (from manufacturers), when available — for JSON-LD. */
  brand?: string;
  /** Resolved model name (from vehicle_models), when available — for JSON-LD. */
  model?: string;
  year?: number;
  vin?: string;
  /** COPART | IAAI | ENCAR badge text. */
  source: string;
  lotNumber?: string;
  /** BG status pill ("Наличен" / "Продаден" …). */
  status?: string;

  // ── State flags (drive UI + SEO) ──
  /** True for a concluded/archived lot → page renders as a result + noindex. */
  isPast: boolean;
  /** True for an active auction lot (countdown vs "Наличен"). */
  isAuction: boolean;
  /** True when the active lot has a valid buy-now price. */
  hasBuyNow: boolean;
  /** ISO sale date → countdown / date row. */
  saleDate?: string;

  // ── Gallery ──
  /** Ordered, de-duplicated image URLs (downloaded CDN copies first, then normal). */
  images: string[];

  // ── Prices (card price + the raw_json appraisal extras) ──
  prices: CarDetailPrice[];

  // ── Spec sheet (only-present rows, already BG-localized where applicable) ──
  /** Primary "headline" specs shown as chips under the title. */
  highlights: CarDetailSpec[];
  /** The full spec sheet (mileage, drivetrain, damage, title, branch, …). */
  specs: CarDetailSpec[];

  // ── Location (for the "Локация" row + JSON-LD availableAtOrFrom) ──
  location?: string;
};

/** A detail page payload: the car plus its same-model related cars. */
export type CarDetailPayload = {
  detail: CarDetail;
  related: CarView[];
};
