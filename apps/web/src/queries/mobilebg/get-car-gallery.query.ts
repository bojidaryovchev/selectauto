import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/**
 * The ordered gallery URLs for one car, plus whether the car may be shown at all.
 *
 * Shared by the mobile.bg photo proxy route and the advert source query so both
 * resolve `mobilebg-img/<carId>/<n>.jpg` to the SAME upstream URL — the index
 * baked into the filename is only meaningful if the array is built identically
 * on both sides.
 *
 * Mirrors `buildGallery` in lib/car-detail-mapper.ts: `images.downloaded` first
 * (stable CDN copies), then `images.normal` for the long tail, then the stored
 * `image_url` as a last resort. Deliberately NOT reusing `getCarDetail` — that
 * one is `"use cache: remote"` keyed per car across ~945k entries, and a photo
 * proxy hit has no business writing into it.
 */

export type CarGallery = {
  images: string[];
  /** True when a paid de-index covers this car — the proxy must then 404. */
  deindexed: boolean;
  /** True when the chosen lot is archived (concluded) — not orderable. */
  archived: boolean;
};

function s(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Nested lookup on an unknown-shaped raw_json (`images.downloaded`). */
function get(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const key of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

export async function getCarGallery(carId: number): Promise<CarGallery | null> {
  if (!Number.isInteger(carId) || carId <= 0) return null;

  const db = getDb();

  const carRows = await db
    .select({ deindexedAt: schema.cars.deindexedAt })
    .from(schema.cars)
    .where(eq(schema.cars.id, carId))
    .limit(1);

  const car = carRows[0];
  if (!car) return null;

  // Active projection first, archived second — same resolution order as
  // getCarDetail, so a concluded car still resolves (and is flagged).
  const active = await db
    .select({ lotId: schema.carListings.lotId })
    .from(schema.carListings)
    .where(eq(schema.carListings.carId, carId))
    .limit(1);

  let lotId = active[0]?.lotId;
  let archived = false;
  if (lotId === undefined) {
    const past = await db
      .select({ lotId: schema.carListingsArchived.lotId })
      .from(schema.carListingsArchived)
      .where(eq(schema.carListingsArchived.carId, carId))
      .limit(1);
    lotId = past[0]?.lotId;
    archived = true;
  }
  if (lotId === undefined) return null;

  const lotRows = await db
    .select({ imageUrl: schema.auctionLots.imageUrl, rawJson: schema.auctionLots.rawJson })
    .from(schema.auctionLots)
    .where(eq(schema.auctionLots.id, lotId))
    .limit(1);

  const lot = lotRows[0];
  if (!lot) return null;

  const images: string[] = [];
  const seen = new Set<string>();
  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const entry of arr) {
      const url = s(entry);
      if (url && !seen.has(url)) {
        seen.add(url);
        images.push(url);
      }
    }
  };
  push(get(lot.rawJson, "images.downloaded"));
  push(get(lot.rawJson, "images.normal"));
  if (images.length === 0 && lot.imageUrl) images.push(lot.imageUrl);

  return { images, deindexed: car.deindexedAt !== null, archived };
}
