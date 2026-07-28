/**
 * UI view-model for a car listing card. Named `CarView` (not `Car`) on purpose:
 * the DB layer (`@selectauto/db/schema`) already exports a `Car` type for
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
  /** Card image URL — served directly from the source CDN (per-source 500–960px
   *  variant), a local image under /public, or null when none is available. */
  image: string | null;
  /**
   * Swap-in URL for when `image` fails to load. Populated ONLY for Copart cards,
   * whose `image` is derived by rewriting the stored `_thb.jpg` thumbnail to its
   * sharper `_ful.jpg` sibling (see lib/car-mapper.ts → copartFullVariant) — an
   * inference from the URL rather than something the API returned, so the card
   * keeps the stored `image_url` copy on hand. Null/absent for every other card,
   * where `image` is API-supplied and needs no safety net.
   */
  imageFallback?: string | null;
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
