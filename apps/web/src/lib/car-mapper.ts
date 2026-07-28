import type { CarListing, CarListingArchived } from "@selectauto/db/schema";
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

/**
 * Upgrade a Copart `_thb.jpg` card URL to its `_ful.jpg` sibling.
 *
 * WHY: `_thb` is MEASURED at 144×108 (~4KB) but the card renders it at 305–490
 * CSS px — a 2.1–3.4× upscale at 1x DPR, 4–7× on retina. `_ful` is 960×720
 * (median ~133KB), which covers the widest card slot at 2x DPR exactly. Copart
 * has no mid-size variant (`_ths`/`_med`/`_mid`/`_sml` all 404) and `_hrs` is
 * 1280×960 — overkill for a card. Only ~473k Copart rows are affected; every
 * other source already stores a 500–1280px URL and passes through untouched.
 *
 * Applied at READ time (not via a backfill) because the rewrite is a pure
 * function of the stored URL, so it fixes existing rows and new ones alike;
 * ingestion applies the identical rule going forward (functions/shared/
 * normalize.ts → copartFullVariant), which makes this a no-op for rows written
 * after that change.
 *
 * CONDITIONAL on the suffix, never a blind swap: some Copart assets exist only
 * as `_vhrs.jpg` (where `_thb`/`_ful`/`_hrs` all 404), and a few hundred rows
 * already store `_hrs`. Anything that is not a `_thb` URL is returned as-is.
 * 491/491 distinct `_thb` assets sampled across the table (incl. archived
 * months) also served `_ful` — strong, but a sample rather than a guarantee,
 * which is why `imageFallback` below carries the stored image_url copy.
 */
const COPART_THUMB_SUFFIX = "_thb.jpg";

function copartFullVariant(url: string): string {
  if (!url.endsWith(COPART_THUMB_SUFFIX)) return url;
  return `${url.slice(0, -COPART_THUMB_SUFFIX.length)}_ful.jpg`;
}

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

  // Card image. `thumbnail_url` is the per-source card URL; for Copart it is
  // upgraded from the 144×108 `_thb` thumbnail to the 960×720 `_ful` sibling.
  // The fallback is attached ONLY when that upgrade actually fired — a
  // non-rewritten URL is the one the API gave us, so it needs no safety net,
  // and keeping the field null everywhere else keeps it out of the RSC payload
  // for the vast majority of cards in the infinite-scroll grid.
  const thumbnail = row.thumbnailUrl ? copartFullVariant(row.thumbnailUrl) : null;
  const rewrote = thumbnail !== null && thumbnail !== row.thumbnailUrl;

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
    // Card image, served DIRECTLY from the source CDN (no bake, no Vercel
    // optimizer): thumbnail_url holds the per-source 500–960px card URL (see
    // functions/shared/normalize.ts → cardImageUrl); image_url is the reliable
    // i.auctionsapi.com fallback.
    image: thumbnail ?? row.imageUrl ?? null,
    // Only set for the speculative Copart `_ful` rewrite — CarCardImage swaps to
    // it if that URL 404s. Null when `image` is already an API-supplied URL.
    imageFallback: rewrote ? (row.imageUrl ?? null) : null,
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
