import { ORG_ID } from "@/lib/site-jsonld";
import type { CarDetail } from "@/types/car-detail.type";

/**
 * Builds Schema.org JSON-LD for a single-car detail page: a `Car` node (Schema.org
 * `Car` ⊂ `Vehicle` ⊂ `Product`) carrying the make/model/year/VIN/mileage/colour
 * AND an `Offer` with price + availability directly on it. `Car` being a `Product`
 * subtype means `offers`/`image`/`brand` are all valid on the same node — so the
 * vehicle attributes and the offer live together, the natural shape, instead of
 * the vehicle being smuggled through `Product.additionalProperty` (which officially
 * expects `PropertyValue`, so a strict parser wouldn't associate the attributes).
 *
 * Google deprecated the dedicated *vehicle rich result* in Sept 2025, so this is no
 * longer about Google rich-result eligibility; the value is AI-search / Bing / voice
 * citation (see docs/11-web-seo-and-indexing.md §6). Emitted only for INDEXABLE
 * pages (active cars with a price) — a concluded lot is noindexed, so its JSON-LD
 * would be ignored anyway (and a sold price as an active Offer is misleading).
 *
 * Prices are formatted strings on `CarDetail`; Schema needs a bare number, so the
 * primary price is re-parsed from its digits. Returns null when there's nothing
 * meaningful to mark up.
 */
export function buildCarJsonLd(detail: CarDetail, url: string): Record<string, unknown> | null {
  // No structured data for concluded lots (noindexed) — see file header.
  if (detail.isPast) return null;

  // Top-level `Car` (IS-A Product), so vehicle attributes + offer sit on one node.
  const car: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: detail.title,
    url,
    ...(detail.images.length > 0 ? { image: detail.images.slice(0, 6) } : {}),
    ...(detail.brand ? { brand: { "@type": "Brand", name: detail.brand } } : {}),
  };
  if (detail.model) car.model = detail.model;
  if (detail.year) car.modelDate = String(detail.year);
  if (detail.vin) car.vehicleIdentificationNumber = detail.vin;

  // Mileage + colour + fuel, pulled from the localized highlight/spec rows where present.
  const mileage = detail.highlights.find((h) => h.label === "Пробег")?.value;
  if (mileage) {
    const km = Number(mileage.replace(/[^\d]/g, ""));
    if (Number.isFinite(km) && km > 0) {
      car.mileageFromOdometer = { "@type": "QuantitativeValue", value: km, unitCode: "KMT" };
    }
  }
  const color = detail.specs.find((sp) => sp.label === "Цвят")?.value;
  if (color) car.color = color;
  const fuel = detail.highlights.find((h) => h.label === "Гориво")?.value;
  if (fuel) car.fuelType = fuel;

  // Engine power (hp) → vehicleEngine.enginePower. Pulled from the "Мощност" spec
  // (present mostly on ENCAR cars, ~93%). unitCode BHP = brake horsepower (UN/CEFACT).
  const power = detail.specs.find((sp) => sp.label === "Мощност")?.value;
  if (power) {
    const hp = Number(power.replace(/[^\d]/g, ""));
    if (Number.isFinite(hp) && hp > 0) {
      car.vehicleEngine = {
        "@type": "EngineSpecification",
        enginePower: { "@type": "QuantitativeValue", value: hp, unitCode: "BHP" },
      };
    }
  }
  // Generation (variant descriptor) → vehicleConfiguration, when resolved.
  const generation = detail.specs.find((sp) => sp.label === "Поколение")?.value;
  if (generation) car.vehicleConfiguration = generation;

  // Offer: the primary price as a bare USD number + in-stock availability, directly
  // on the Car node (valid because Car IS-A Product).
  const primary = detail.prices.find((p) => p.primary);
  if (primary) {
    const amount = Number(primary.value.replace(/[^\d]/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      car.offers = {
        "@type": "Offer",
        price: amount,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url,
        // Connect the offer to the site-wide AutoDealer entity (entity graph).
        seller: { "@id": ORG_ID },
        ...(detail.location ? { availableAtOrFrom: { "@type": "Place", name: detail.location } } : {}),
      };
    }
  }

  return car;
}
