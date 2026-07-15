import { and, asc, eq, sql } from "drizzle-orm";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import type { CarView } from "@/types/car.type";

/** One recipient of today's favourites-auction digest + their due cars. */
export type DueAuctionAlert = {
  userId: string;
  email: string;
  name: string | null;
  /** The user's favourited cars whose auction is today, soonest first. */
  cars: CarView[];
};

/**
 * Every opted-in user who has at least one favourited car whose auction is
 * TODAY, grouped per user, for the daily digest cron
 * (api/cron/favorite-auction-alerts). A SYSTEM query — it reads across all users
 * and is NOT auth-gated (the cron route authorises the request via CRON_SECRET).
 *
 * Filters:
 *  - `favorite_auction_alerts = true` — opted in on /lyubimi.
 *  - `email_verified IS NOT NULL` — never email an unverified address (password
 *    sign-in already requires this; OAuth users are verified by the adapter).
 *  - sent-guard: skip anyone whose `favorite_auction_alert_sent_on` already
 *    equals today's America/New_York auction day, so a duplicate/retried cron
 *    invocation can't double-send. `IS DISTINCT FROM` also lets NULL (never sent)
 *    through.
 *  - the "today" auction window — mirrors `auctionWindow === "today"` in
 *    lib/car-listing-conditions.ts: `sale_date` is in the future AND before the
 *    end of the current America/New_York auction day. Only active `car_listings`
 *    (upcoming lots) are joined — archived/concluded lots never qualify.
 */
export async function getDueFavoriteAuctionAlerts(): Promise<DueAuctionAlert[]> {
  const db = getDb();
  const { users, favorites, carListings } = schema;

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      listing: carListings,
    })
    .from(users)
    .innerJoin(favorites, eq(favorites.userId, users.id))
    .innerJoin(carListings, eq(carListings.carId, favorites.carId))
    .where(
      and(
        eq(users.favoriteAuctionAlerts, true),
        sql`${users.emailVerified} IS NOT NULL`,
        sql`${users.favoriteAuctionAlertSentOn} IS DISTINCT FROM (now() AT TIME ZONE 'America/New_York')::date`,
        sql`${carListings.saleDate} > now()`,
        sql`${carListings.saleDate} < date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York' + interval '1 day'`,
      ),
    )
    .orderBy(asc(carListings.saleDate));

  // Group by user, preserving the sale-date ordering within each user's list.
  const byUser = new Map<string, DueAuctionAlert>();
  for (const row of rows) {
    let entry = byUser.get(row.userId);
    if (!entry) {
      entry = { userId: row.userId, email: row.email, name: row.name, cars: [] };
      byUser.set(row.userId, entry);
    }
    entry.cars.push(carListingToView(row.listing, false));
  }

  return [...byUser.values()];
}
