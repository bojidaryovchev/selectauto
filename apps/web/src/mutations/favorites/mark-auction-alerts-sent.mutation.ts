import { inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/**
 * Stamps `favorite_auction_alert_sent_on` = today's America/New_York auction day
 * for the given users, after their digest has been sent. The digest query
 * (`getDueFavoriteAuctionAlerts`) then skips them for the rest of the day, so a
 * duplicate/retried cron invocation can't double-send.
 *
 * A plain (non-action) server helper — called only by the cron route, never
 * exposed to the client. No-op on an empty list.
 */
export async function markFavoriteAuctionAlertsSent(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  await getDb()
    .update(schema.users)
    .set({ favoriteAuctionAlertSentOn: sql`(now() AT TIME ZONE 'America/New_York')::date` })
    .where(inArray(schema.users.id, userIds));
}
