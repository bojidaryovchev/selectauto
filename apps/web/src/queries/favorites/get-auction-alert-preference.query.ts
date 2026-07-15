import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/lib/db";

/**
 * Whether the signed-in user has opted in to the daily "любими автомобили с
 * търг днес" email digest (`users.favorite_auction_alerts`). Seeds the initial
 * state of the toggle on /lyubimi.
 *
 * Returns `false` when signed out (the toggle is only shown to signed-in users
 * anyway). NOT cached — per-user, request-scoped (same reasoning as
 * getFavoriteCarIds), and a single PK lookup on users.
 */
export async function getAuctionAlertPreference(): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return false;

  const rows = await getDb()
    .select({ enabled: schema.users.favoriteAuctionAlerts })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return rows[0]?.enabled ?? false;
}
