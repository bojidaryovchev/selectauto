import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import type { CarView } from "@/types/car.type";

/**
 * The signed-in user's favourited cars as `CarView[]` for the /lyubimi page,
 * newest-favourited first.
 *
 * A favourite is keyed by `car_id`, which can live in EITHER read model: an
 * active car in `car_listings` or a sold one in `car_listings_archived` (the two
 * tables are disjoint — a car is active XOR past). So we join favourites to each
 * table separately and map with the matching `isPast` flag (active card = full
 * CTA; past card = "Продаден" result). A favourite whose car has since dropped
 * out of BOTH tables (e.g. lot purged) simply doesn't appear — no broken card.
 *
 * Not cached — per-user, request-scoped (same reasoning as getFavoriteCarIds).
 * Ordered by `favorites.created_at DESC` within each table; the two result sets
 * are concatenated active-first (active inventory is the actionable part the user
 * most likely wants on top).
 */
export async function getFavoriteCars(): Promise<CarView[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const db = getDb();
  const fav = schema.favorites;

  // Active favourites (join → car_listings).
  const activeRows = await db
    .select({ listing: schema.carListings, createdAt: fav.createdAt })
    .from(fav)
    .innerJoin(schema.carListings, eq(schema.carListings.carId, fav.carId))
    .where(eq(fav.userId, userId))
    .orderBy(desc(fav.createdAt));

  // Past/sold favourites (join → car_listings_archived).
  const pastRows = await db
    .select({ listing: schema.carListingsArchived, createdAt: fav.createdAt })
    .from(fav)
    .innerJoin(schema.carListingsArchived, eq(schema.carListingsArchived.carId, fav.carId))
    .where(eq(fav.userId, userId))
    .orderBy(desc(fav.createdAt));

  return [
    ...activeRows.map((r) => carListingToView(r.listing, false)),
    ...pastRows.map((r) => carListingToView(r.listing, true)),
  ];
}
