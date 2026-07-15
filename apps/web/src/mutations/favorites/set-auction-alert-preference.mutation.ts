"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Turns the daily "любими автомобили с търг днес" email digest on/off for the
 * signed-in user (`users.favorite_auction_alerts`).
 *
 * Auth is gated PER-ACTION (mirroring toggleFavorite): a Server Action is a
 * public endpoint, so a signed-out caller gets `{ success: false }` with no DB
 * write. `enabled` is coerced to a strict boolean since the action is callable
 * with an arbitrary body.
 *
 * When the user ENABLES alerts we also clear `favorite_auction_alert_sent_on`,
 * so if they have a favourite whose auction is already today they still get that
 * day's digest on the next cron run (the sent-guard would otherwise skip a day
 * they'd been sent for before turning it back on — but here they just opted in,
 * so a fresh send is the expected behaviour).
 */
export async function setAuctionAlertPreference(
  enabled: unknown,
): Promise<ActionResult<{ enabled: boolean }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "Трябва да влезете в профила си." };
  }

  const value = enabled === true;

  try {
    await getDb()
      .update(schema.users)
      .set({
        favoriteAuctionAlerts: value,
        // Enabling → allow today's digest through again; disabling leaves it be.
        ...(value ? { favoriteAuctionAlertSentOn: null } : {}),
      })
      .where(eq(schema.users.id, userId));

    return { success: true, data: { enabled: value } };
  } catch (error) {
    console.error("[set-auction-alert-preference] failed", error);
    return { success: false, error: "Възникна грешка. Моля опитайте отново." };
  }
}
