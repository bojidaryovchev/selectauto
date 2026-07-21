/**
 * UI view-model for a car listing card. Named `CarView` (not `Car`) on purpose:
 * the DB layer (`@auctions-ingestion/db/schema`) already exports a `Car` type for
 * a `cars` table row, and the listing card is a *projection* of a car + its
 * auction lot, not that row. The car queries (`@/queries/cars`) map DB rows to
 * this shape via `@/lib/car-mapper`; the static fallback data uses it directly.
 */
export type CarView = {
  title: string;
  href: string;
  price?: string;
  mileage: string;
  /** Engine displacement/type — shows a "Двигател:" line when present. */
  engine?: string;
  source: string;
  /** Local image under /public, a remote URL, or null when none is available.
   *  When `imageBaked` is true this is our own CloudFront thumbnail URL. */
  image: string | null;
  /**
   * True when `image` is a pre-baked thumbnail on our S3+CloudFront (built at
   * ingestion). The card then renders it with `<Image unoptimized>`, bypassing
   * Vercel Image Optimization entirely. False/undefined → `image` is a raw
   * upstream/local URL that still goes through the optimizer (q=60).
   */
  imageBaked?: boolean;
  /** Buy-now listings show "BUY NOW"; auction listings show an end time. */
  badge: { kind: "buy" } | { kind: "time"; label: string };

  // ── Rich fields for the AuctionCard (now used everywhere cards appear —
  //    catalog, homepage, vnos hubs, related, favourites). Optional so the static
  //    FALLBACK_* arrays (DB-miss fallback) keep compiling unchanged; the all-cars
  //    mapper (`carListingToView`) always populates these. ──
  /** car_listings.car_id — stable key for virtualization + the detail link. */
  id?: number;
  /**
   * car_listings.sort_id — the keyset value this row was ordered by. The catalog
   * grid uses it as the bidirectional infinite-scroll cursor (the lowest loaded
   * sort_id pages DOWN, the highest pages UP) and as the shareable `?after=`
   * page-pointer written to the URL as the top card scrolls. Only the all-cars
   * mapper populates it; the static FALLBACK_* arrays omit it.
   */
  sortId?: number;
  /** Lot number → "Търг №" row. */
  lotNumber?: string;
  /** Production year → "Година" row (also in the title, shown as its own field). */
  year?: number;
  /** Chosen lot sale date (ISO) → date row + the live countdown. */
  saleDate?: string;
  /** BG-localized status pill ("Наличен" / "Предстои" / "Продаден" …). */
  status?: string;
  /** BG-localized condition ("Пали и се движи" …). */
  condition?: string;
  /** Damage (top values BG-mapped, long tail passthrough). */
  damage?: string;
  /** BG-localized drivetrain ("Предно" / "4x4" / "Задно"). */
  drive?: string;
  /** BG-localized gearbox ("Автоматична" / "Ръчна"). */
  transmission?: string;
  /** Seller name (passthrough). */
  seller?: string;
  /** BG-localized colour ("Черен" …) — a filterable shown on the card. */
  color?: string;
  /** BG-localized vehicle/body type ("Джип (SUV)" / "Лодка" …). */
  type?: string;
  /** True when the type is a NON-automobile category (boat/trailer/moto/…) → a
   *  type chip is shown by the title so it's obvious at a glance. */
  isNonCar?: boolean;
  /** True for auction lots (controls countdown vs "Наличен"). */
  isAuction?: boolean;
  /** True when an auction lot also has a valid buy-now (shows the BUY NOW badge). */
  hasBuyNow?: boolean;
  /**
   * True for the past/sold view (car_listings_archived). The card renders as a
   * result: "Продаден" + realized price + sale date, with no phone/Viber/
   * countdown or buy CTA (the lot is gone — it's price-research data).
   */
  isPast?: boolean;
};
