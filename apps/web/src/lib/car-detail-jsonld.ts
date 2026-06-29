import type { CarDetail } from "@/types/car-detail.type";

/**
 * Builds Schema.org JSON-LD for a single-car detail page: a `Vehicle` (make/
 * model/year/VIN/mileage/colour) wrapped in a `Product` with an `Offer` carrying
 * the price + availability. This is the structured data that lets the active
 * catalog earn rich results / vehicle-listing eligibility. We emit it only for
 * INDEXABLE pages (active cars with a price) — a concluded lot is noindexed, so
 * its JSON-LD would be ignored anyway (and a sold price as an active Offer is
 * misleading). The page injects the returned object as a <script type="ld+json">.
 *
 * Prices are formatted strings on `CarDetail`; Schema needs a bare number, so the
 * primary price is re-parsed from its digits. Returns null when there's nothing
 * meaningful to mark up.
 */
export function buildCarJsonLd(detail: CarDetail, url: string): Record<string, unknown> | null {
  // No structured data for concluded lots (noindexed) — see file header.
  if (detail.isPast) return null;

  const vehicle: Record<string, unknown> = {
    "@type": "Vehicle",
    name: detail.title,
  };
  if (detail.brand) vehicle.brand = { "@type": "Brand", name: detail.brand };
  if (detail.model) vehicle.model = detail.model;
  if (detail.year) vehicle.modelDate = String(detail.year);
  if (detail.vin) vehicle.vehicleIdentificationNumber = detail.vin;

  // Mileage + colour, pulled from the localized highlight/spec rows where present.
  const mileage = detail.highlights.find((h) => h.label === "Пробег")?.value;
  if (mileage) {
    const km = Number(mileage.replace(/[^\d]/g, ""));
    if (Number.isFinite(km) && km > 0) {
      vehicle.mileageFromOdometer = { "@type": "QuantitativeValue", value: km, unitCode: "KMT" };
    }
  }
  const color = detail.specs.find((sp) => sp.label === "Цвят")?.value;
  if (color) vehicle.color = color;
  const fuel = detail.highlights.find((h) => h.label === "Гориво")?.value;
  if (fuel) vehicle.fuelType = fuel;

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: detail.title,
    url,
    ...(detail.images.length > 0 ? { image: detail.images.slice(0, 6) } : {}),
    ...(detail.brand ? { brand: { "@type": "Brand", name: detail.brand } } : {}),
    additionalProperty: vehicle,
  };

  // Offer: the primary price as a bare EUR number + in-stock availability.
  const primary = detail.prices.find((p) => p.primary);
  if (primary) {
    const amount = Number(primary.value.replace(/[^\d]/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      product.offers = {
        "@type": "Offer",
        price: amount,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url,
        ...(detail.location ? { availableAtOrFrom: { "@type": "Place", name: detail.location } } : {}),
      };
    }
  }

  return product;
}
