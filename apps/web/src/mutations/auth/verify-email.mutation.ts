"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Verifies a new account from the email link: looks up the (still-valid)
 * verification token, marks the matching user's email verified, and consumes the
 * token. After this the user can sign in with their password.
 *
 * Returns a generic error for missing/expired/used tokens (don't distinguish —
 * avoids probing). Idempotent-ish: a token is single-use (deleted on success), so
 * a second click on the same link reports the generic error, but the account is
 * already verified.
 */
export async function verifyEmail(token: unknown): Promise<ActionResult> {
  if (typeof token !== "string" || token.trim() === "") {
    return { success: false, error: "Невалиден или изтекъл линк за потвърждение." };
  }

  try {
    const db = getDb();

    // Find a non-expired token row.
    const rows = await db
      .select()
      .from(schema.verificationTokens)
      .where(
        and(
          eq(schema.verificationTokens.token, token),
          gt(schema.verificationTokens.expires, new Date()),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { success: false, error: "Невалиден или изтекъл линк за потвърждение." };
    }

    // Mark the user (matched by the token's identifier = email) verified.
    await db
      .update(schema.users)
      .set({ emailVerified: new Date() })
      .where(eq(sql`lower(${schema.users.email})`, row.identifier.toLowerCase()));

    // Consume the token (and any others for this identifier).
    await db
      .delete(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, row.identifier));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[verify-email] failed", error);
    return { success: false, error: "Възникна грешка. Моля опитайте отново." };
  }
}
