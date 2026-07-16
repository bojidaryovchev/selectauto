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
  /** Render an inline copy-to-clipboard button next to the value (VIN, lot №) —
   *  identifiers the user pastes into a Carfax/VIN lookup or quotes to us. */
  copyable?: boolean;
};

/** Which market a car comes from — discriminates the detail-page render mode. */
export type CarMarket = "us" | "kr" | "other";

/** Extra media surfaces beyond the still gallery (US 360°/engine-video, hi-res set). */
export type CarMedia = {
  /** IAAI 360° spin viewer URL (`external_panorama_url`), when present. */
  panorama360?: string;
  /** Engine-run video URL (`images.video`), when present. */
  engineVideo?: string;
  /** Hi-res image set (`images.big`) for the lightbox; may be empty. */
  hiRes: string[];
};

/** Live current bid + when it was last updated (US auction lots). */
export type CarLiveBid = {
  /** Pre-formatted amount ("12 500 $"). */
  value: string;
  /** ISO timestamp of the last bid update, when known. */
  updatedAt?: string;
};

/** One entry in the ENCAR vehicle-history timeline (`details.history[]`). */
export type CarHistoryEntry = {
  /** Raw date label as provided ("February 22", "October 21"). */
  date?: string;
  /** Event title ("Owner change", "Insurance processing after damage …"). */
  title?: string;
  /** BG-localized flag pill ("Дилър" / "Отзоваване (изпълнено)" …). */
  flag?: string;
  /** Free-text sub-detail line, when present. */
  sub?: string;
};

/** One insurance accident record (`details.insurance_v2.accidents[]`). */
export type CarInsuranceAccident = {
  date?: string;
  /** Formatted approx USD ("~1 375 $") — converted from raw KRW. */
  cost?: string;
};

/** ENCAR insurance/ownership summary (`details.insurance_v2`). */
export type CarInsurance = {
  ownerChanges: number;
  ownerChangeDates: string[];
  accidentCount: number;
  myAccidentCount: number;
  otherAccidentCount: number;
  totalLossCount: number;
  floodCount: number;
  theftCount: number;
  /** Formatted approx USD ("~1 375 $"), when > 0. */
  myAccidentCost?: string;
  otherAccidentCost?: string;
  accidents: CarInsuranceAccident[];
};

/** One mechanical-inspection point (`details.inspect.inner.*`). */
export type CarInspectionMechanic = {
  label: string;
  /** BG status value ("Изправно" / "Няма" / "Има"). */
  status: string;
  /** Dot colour: OK (green) vs a flagged problem (amber). */
  tone: "ok" | "warn";
};

/** One body-panel repair note (`details.inspect.outer.<panel>[]`). */
export type CarInspectionPanel = {
  /** BG panel name ("Преден капак", "Калник (десен)"). */
  label: string;
  /** BG repair state ("Смяна" / "Ламарина" / "Заварка"). */
  status: string;
};

/** ENCAR state-inspection block (`details.inspect` + `details.inspect_outer`). */
export type CarInspection = {
  /** Headline accident-summary verdicts (label + BG value). */
  summary: CarDetailSpec[];
  /** Mechanical-checks grid. */
  mechanics: CarInspectionMechanic[];
  /** Non-original body panels (empty when the body is intact). */
  panels: CarInspectionPanel[];
};

/** One priced factory extra (`details.options_extra[]`). */
export type CarFactoryExtra = {
  name: string;
  /** Formatted price, when the upstream `price` is present. */
  price?: string;
};

/** ENCAR factory options (`details.options.standard[]` decoded + `options_extra[]`). */
export type CarFactoryOptions = {
  /** Standard equipment, decoded via the korea-options dictionary, grouped by section. */
  standard: { section: string; names: string[] }[];
  /** Dealer/priced extras (already English upstream). */
  extras: CarFactoryExtra[];
};

export type CarDetail = {
  /** car_listings.car_id — the route param + canonical key. */
  id: number;

  // ── Identity / heading ──
  title: string;
  /** Resolved brand name (from manufacturers), when available — for JSON-LD. */
  brand?: string;
  /** Resolved brand logo SVG URL (from manufacturers.image_url), when available. */
  brandLogo?: string;
  /** Resolved model name (from vehicle_models), when available — for JSON-LD. */
  model?: string;
  /** manufacturers.external_id — the catalog `?brand=` param, for deep-linking a
   *  concluded car to its make-filtered catalog view. */
  brandExternalId?: number;
  /** vehicle_models.external_id — the catalog `?model=` param (brand-scoped). */
  modelExternalId?: number;
  /** Resolved generation (from vehicle_generations) — name + year range, when available. */
  generation?: { name?: string; fromYear?: number; toYear?: number };
  year?: number;
  vin?: string;
  /** COPART | IAAI | ENCAR badge text. */
  source: string;
  /** Which market drives the render mode: US salvage vs KR retail. */
  market: CarMarket;
  /**
   * BG-localized sourcing country ("Корея" / "САЩ" / "Канада") for the
   * „внос от …" phrasing in metadata titles/descriptions. Derived from the
   * market (kr) or the lot's `location_country` (us — Copart/IAAI run both US
   * and Canadian branches, so the market alone can't name the country).
   * Absent when the country can't be stated confidently — consumers must not guess.
   */
  sourceCountry?: string;
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
  /**
   * Market benchmark: the average realized sale price for this model+year across our
   * archive of concluded auctions (getModelYearSoldStat). Lets a buyer sanity-check
   * this listing against what similar cars actually sold for. Absent when there
   * aren't enough comparables.
   */
  marketAvg?: { value: string; count: number };

  // ── Spec sheet (only-present rows, already BG-localized where applicable) ──
  /** Primary "headline" specs shown as chips under the title. */
  highlights: CarDetailSpec[];
  /** The full spec sheet (mileage, drivetrain, damage, title, branch, …). */
  specs: CarDetailSpec[];

  // ── Location (for the "Локация" row + JSON-LD availableAtOrFrom) ──
  location?: string;
  /** Lot coordinates (US Copart/IAAI branches carry these; ENCAR does not) → map. */
  geo?: { lat: number; lng: number };

  // ── Media beyond the still gallery (both markets) ──
  media?: CarMedia;

  // ── US-market extras (Copart/IAAI) ──
  /** Cert / AutoCheck / inspection tag chips (`tags[]`). */
  usTags?: string[];
  /**
   * IAA Vehicle Score — IAAI's AI damage rating on a **0–50** scale (50 = least
   * damage, 0 = non-repairable). IAAI-only (`grade_iaai`); Copart/Encar omit it.
   * NOTE: this is a native 0–50 score, NOT a 0.0–5.0 grade — a stored `37` means
   * "37 / 50" (moderate damage), never "3.7". Rendered by `CarIaaScore`.
   */
  iaaScore?: number;
  /** Live current bid + freshness (active US auction lots). */
  liveBid?: CarLiveBid;
  /** Selling party — name (+ insurer logo for IAAI, `seller.logo`), when present. */
  seller?: { name?: string; logo?: string };
  /** True only when the odometer is explicitly NOT actual → a caution badge. */
  odometerNotActual?: boolean;
  /** Prior-use caution ("Бивша под наем" …) from ENCAR `details.usage_types` — a
   *  value-relevant history flag shown as a badge. Absent for normal private use. */
  usageFlag?: string;

  // ── KR-market blocks (ENCAR active lots; absent on archived/stripped lots) ──
  history?: CarHistoryEntry[];
  insurance?: CarInsurance;
  inspection?: CarInspection;
  factoryOptions?: CarFactoryOptions;
  /** Seller free-text blurb (English primary, Korean fallback). */
  sellerNote?: { en?: string; ko?: string };
};

/** A detail page payload: the car plus its same-model related cars. */
export type CarDetailPayload = {
  detail: CarDetail;
  related: CarView[];
};
