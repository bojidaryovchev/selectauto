import type { CarListing, CarListingArchived } from "@auctions-ingestion/db/schema";
import {
  bodyTypeLabel,
  colorLabel,
  conditionLabel,
  damageLabel,
  driveLabel,
  isActiveStatus,
  sourceBadge,
  statusLabel,
  transmissionLabel,
  vehicleTypeLabel,
} from "@/lib/car-labels";
import { collapseLeadingDuplicate } from "@/lib/title-clean";
import type { CarView } from "@/types/car.type";

/**
 * Maps a database listing (an `auction_lots` row joined to its `cars` row) to the
 * UI `CarView` consumed by the listing card. Centralizes the formatting the
 * static snapshot encoded by hand: price (NUMERIC → "16 743 $"), odometer
 * ("97 626 км"), the ENCAR/IAAI source label, and the buy-now-vs-auction-time
 * badge.
 *
 * NUMERIC columns come back from Drizzle as strings (see schema.ts — correct for
 * money), so prices are parsed with `Number()` before formatting.
 */

/** "16743.00" | 16743 → "16 743 $" (thin-space grouping, like the live site). */
function formatPrice(value: string | number | null): string | undefined {
  if (value === null) return undefined;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} $`;
}

/** 186795 → "186 795 km" (the rich card uses Latin "km"). */
function formatKm(km: number | null): string {
  if (km === null || !Number.isFinite(km) || km < 0) return "";
  return `${Math.round(km).toLocaleString("bg-BG").replace(/ /g, " ")} km`;
}

/** A row from either projection table — identical shape (active or past/sold). */
type AnyCarListing = CarListing | CarListingArchived;

/** "YYYY Title" from the car_listings row (year + title), trimmed. Some upstream
 *  titles already start with the year (e.g. "2015 Nissan Frontier") — don't
 *  double it. Also collapses upstream-duplicated leading blocks
 *  ("2020 Freightliner Cascadia 126 2020 Freightliner Cascadia 126 …" — the
 *  Ritchie-Bros-sourced IAAI trucks; see lib/title-clean.ts). */
function listingTitle(row: AnyCarListing): string {
  const t = collapseLeadingDuplicate(row.title?.trim() ?? "");
  if (t && row.carYear && !/^\d{4}\b/.test(t)) return `${row.carYear} ${t}`;
  return t || `Лот ${row.lotNumber ?? row.carId}`;
}

/**
 * Maps a `car_listings` projection row (one per physical car, already deduped and
 * pre-joined — see docs/05-projection-tables-car-listings.md) to the UI `CarView` for the all-cars
 * page's AuctionCard. Single-row (no lot+car join). Value i18n is applied HERE
 * (BG labels for status/condition/drive/transmission/damage); engine/title/
 * seller are verbatim. Brand/model NAMES aren't on the row (the daily reference
 * sync can change them) — pass a resolved name via `brandModel` for the title if
 * desired; by default the row's `title` already includes the model.
 */
/** Combined vehicle/body type → BG label (mirrors the "Тип" facet logic). For an
 *  automobile we show the body type (SUV/Седан/…); otherwise the vehicle type
 *  (Лодка/Камион/…). Returns the label + whether it's a non-car category. */
function typeLabel(vehicleType: string | null, bodyType: string | null): { label?: string; isNonCar: boolean } {
  if (vehicleType && vehicleType !== "automobile") {
    return { label: vehicleTypeLabel(vehicleType) || undefined, isNonCar: true };
  }
  return { label: bodyType ? bodyTypeLabel(bodyType) || undefined : undefined, isNonCar: false };
}

export function carListingToView(row: AnyCarListing, isPast = false): CarView {
  // Buy-now when the chosen lot is buy_now with a positive price; otherwise it's
  // an auction listing. `status` decides the active/ended pill either way.
  const isBuyNow = row.buyNow === true && Number(row.buyNowPrice ?? 0) > 0;
  const isAuction = !isBuyNow;
  const type = typeLabel(row.vehicleType, row.bodyType);

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
    // Keyset value for the catalog grid's bidirectional cursor + `?after=` pointer.
    sortId: row.sortId,
    title: listingTitle(row),
    // Deep-link to the single-car detail page (`/avtomobil/[carId]`). Works for
    // both active and past rows — an archived car resolves there too (rendered as
    // a result + noindexed). No trailing slash — the site canonicalizes to the
    // slashless form (a trailing slash 308-redirects), matching the other routes.
    href: `/avtomobil/${row.carId}`,
    price,
    mileage: formatKm(row.odometerKm),
    engine: row.engine ?? undefined, // verbatim spec string ("2.0l 4"); not translated
    source: sourceBadge(row.domainName),
    // Prefer the baked CloudFront thumbnail (served `unoptimized`, off Vercel's
    // image optimizer); fall back to the raw upstream URL (optimized) until the
    // bake worker fills thumbnail_url in.
    image: row.thumbnailUrl ?? row.imageUrl ?? null,
    imageBaked: !!row.thumbnailUrl,
    // Past cards always show a result label ("Продаден"/…); active cards show the
    // buy badge or the live status.
    badge: isPast
      ? { kind: "time", label: statusLabel(row.status) }
      : isBuyNow
        ? { kind: "buy" }
        : { kind: "time", label: statusLabel(row.status) },

    // rich AuctionCard fields
    lotNumber: row.lotNumber ?? undefined,
    year: row.carYear ?? undefined,
    saleDate: row.saleDate ? row.saleDate.toISOString() : undefined,
    status: statusLabel(row.status),
    condition: conditionLabel(row.condition) || undefined,
    damage: damageLabel(row.damageMain) || undefined,
    drive: driveLabel(row.driveWheel) || undefined,
    transmission: transmissionLabel(row.transmission) || undefined,
    seller: row.seller ?? undefined,
    color: colorLabel(row.carColor) || undefined,
    type: type.label,
    isNonCar: type.isNonCar,
    // Past cards are never "active auctions" → no countdown; never show buy badge.
    isAuction: isPast ? false : isAuction,
    hasBuyNow: isPast ? false : row.buyNow === true && Number(row.buyNowPrice ?? 0) > 0,
    isPast,
  };
}

/** Re-exported for the card's countdown decision (active vs ended auction). */
export { isActiveStatus };
