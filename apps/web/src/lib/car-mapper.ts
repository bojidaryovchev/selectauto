import type { AuctionLot, Car, CarListing, CarListingArchived } from "@auctions-ingestion/db/schema";
import {
  conditionLabel,
  damageLabel,
  driveLabel,
  isActiveStatus,
  sourceBadge,
  statusLabel,
  transmissionLabel,
} from "@/lib/car-labels";
import type { CarView } from "@/types/car.type";

/**
 * Maps a database listing (an `auction_lots` row joined to its `cars` row) to the
 * UI `CarView` consumed by the listing card. Centralizes the formatting the
 * static snapshot encoded by hand: price (NUMERIC → "16 743 €"), odometer
 * ("97 626 км"), the ENCAR/IAAI source label, and the buy-now-vs-auction-time
 * badge.
 *
 * NUMERIC columns come back from Drizzle as strings (see schema.ts — correct for
 * money), so prices are parsed with `Number()` before formatting.
 */

/** A lot plus the (nullable) car it belongs to — the shape the queries select. */
export type LotWithCar = {
  lot: Pick<
    AuctionLot,
    | "id"
    | "lotNumber"
    | "domainName"
    | "buyNow"
    | "buyNowPrice"
    | "bidPrice"
    | "finalBid"
    | "odometerKm"
    | "imageUrl"
    | "saleDate"
  >;
  car: Pick<Car, "title" | "year" | "engine"> | null;
};

/** "16743.00" | 16743 → "16 743 €" (thin-space grouping, like the live site). */
function formatPrice(value: string | number | null): string | undefined {
  if (value === null) return undefined;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} €`;
}

/** 97626 → "97 626 км". */
function formatMileage(km: number | null): string {
  if (km === null || !Number.isFinite(km) || km < 0) return "";
  return `${km.toLocaleString("bg-BG").replace(/ /g, " ")} км`;
}

/** Sale date → "30.06.2026 · 11:30" (the auction badge label). */
function formatSaleDate(date: Date | null): string {
  if (!date) return "Предстои";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} · ${hh}:${min}`;
}

/** 186795 → "186 795 km" (the rich card uses Latin "km", like the legacy markup). */
function formatKm(km: number | null): string {
  if (km === null || !Number.isFinite(km) || km < 0) return "";
  return `${Math.round(km).toLocaleString("bg-BG").replace(/ /g, " ")} km`;
}

/** A row from either projection table — identical shape (active or past/sold). */
type AnyCarListing = CarListing | CarListingArchived;

/** "YYYY Title" from the car_listings row (year + title), trimmed. Some upstream
 *  titles already start with the year (e.g. "2015 Nissan Frontier") — don't
 *  double it. */
function listingTitle(row: AnyCarListing): string {
  const t = row.title?.trim() ?? "";
  if (t && row.carYear && !/^\d{4}\b/.test(t)) return `${row.carYear} ${t}`;
  return t || `Лот ${row.lotNumber ?? row.carId}`;
}

/**
 * Maps a `car_listings` projection row (one per physical car, already deduped and
 * pre-joined — see ALL-CARS-DB-DESIGN.md) to the UI `CarView` for the all-cars
 * page's AuctionCard. Single-row (no lot+car join). Value i18n is applied HERE
 * (BG labels for status/condition/drive/transmission/damage); engine/title/
 * seller are verbatim. Brand/model NAMES aren't on the row (the daily reference
 * sync can change them) — pass a resolved name via `brandModel` for the title if
 * desired; by default the row's `title` already includes the model.
 */
export function carListingToView(row: AnyCarListing, isPast = false): CarView {
  // Buy-now when the chosen lot is buy_now with a positive price; otherwise it's
  // an auction listing. `status` decides the active/ended pill either way.
  const isBuyNow = row.buyNow === true && Number(row.buyNowPrice ?? 0) > 0;
  const isAuction = !isBuyNow;

  // Price: for past/sold rows, effective_price IS the realized sale price
  // (final_bid-preferred in the archived recompute). For active, buy-now price
  // for buy-now else the running/final effective_price.
  const price = isPast
    ? formatPrice(row.effectivePrice)
    : isBuyNow
      ? formatPrice(row.buyNowPrice)
      : formatPrice(row.effectivePrice);

  return {
    id: row.carId,
    title: listingTitle(row),
    // No per-lot detail route yet (deferred follow-up) — link to the relevant
    // section page like the homepage mapper does. Past cards aren't actionable,
    // so they don't deep-link anywhere meaningful.
    href: isBuyNow ? "/коли-за-продажба/" : "/внос/",
    price,
    mileage: formatKm(row.odometerKm),
    engine: row.engine ?? undefined, // verbatim spec string ("2.0l 4"); not translated
    source: sourceBadge(row.domainName),
    image: row.imageUrl ?? null,
    // Past cards always show a result label ("Продаден"/…); active cards show the
    // buy badge or the live status.
    badge: isPast
      ? { kind: "time", label: statusLabel(row.status) }
      : isBuyNow
        ? { kind: "buy" }
        : { kind: "time", label: statusLabel(row.status) },

    // rich AuctionCard fields
    lotNumber: row.lotNumber ?? undefined,
    saleDate: row.saleDate ? row.saleDate.toISOString() : undefined,
    status: statusLabel(row.status),
    condition: conditionLabel(row.condition) || undefined,
    damage: damageLabel(row.damageMain) || undefined,
    drive: driveLabel(row.driveWheel) || undefined,
    transmission: transmissionLabel(row.transmission) || undefined,
    seller: row.seller ?? undefined,
    // Past cards are never "active auctions" → no countdown; never show buy badge.
    isAuction: isPast ? false : isAuction,
    hasBuyNow: isPast ? false : row.buyNow === true && Number(row.buyNowPrice ?? 0) > 0,
    isPast,
  };
}

/** Re-exported for the card's countdown decision (active vs ended auction). */
export { isActiveStatus };

/** Builds the car title from the joined car row, falling back to the lot number. */
function buildTitle(row: LotWithCar): string {
  if (row.car?.title) {
    return row.car.year ? `${row.car.year} ${row.car.title}` : row.car.title;
  }
  return `Лот ${row.lot.lotNumber}`;
}

export function toCarView(row: LotWithCar): CarView {
  const isBuyNow = row.lot.buyNow === true;
  // Buy-now price for buy-now lots; otherwise the running/final bid for auctions.
  const price = isBuyNow
    ? formatPrice(row.lot.buyNowPrice)
    : formatPrice(row.lot.finalBid ?? row.lot.bidPrice);

  return {
    title: buildTitle(row),
    // No per-lot detail route yet — link to the relevant listings section, like
    // the static snapshot does. Swap for `/car/${row.lot.id}/` when a detail
    // page exists.
    href: isBuyNow ? "/коли-за-продажба/" : "/внос/",
    price,
    mileage: formatMileage(row.lot.odometerKm),
    engine: row.car?.engine ?? undefined,
    source: row.lot.domainName ?? "—",
    image: row.lot.imageUrl ?? null,
    badge: isBuyNow
      ? { kind: "buy" }
      : { kind: "time", label: formatSaleDate(row.lot.saleDate) },
  };
}
