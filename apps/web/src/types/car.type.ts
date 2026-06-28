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
  /** Local image under /public, a remote URL, or null when none is available. */
  image: string | null;
  /** Buy-now listings show "BUY NOW"; auction listings show an end time. */
  badge: { kind: "buy" } | { kind: "time"; label: string };

  // ── Rich fields for the /vsichki-avtomobili AuctionCard (optional so the
  //    homepage CarCard + static FALLBACK_* arrays keep compiling unchanged).
  //    The all-cars mapper (`carListingToView`) always populates these. ──
  /** car_listings.car_id — stable key for virtualization + the detail link. */
  id?: number;
  /** Lot number → "Търг №" row. */
  lotNumber?: string;
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
