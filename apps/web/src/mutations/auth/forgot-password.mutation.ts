"use server";

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newToken, resetExpiry } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/schemas/auth.schema";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Starts a password reset: if the email belongs to a password user, issue a
 * single-use reset token and email the link. ALWAYS returns success regardless of
 * whether the email exists or is a Google-only account — never reveal which
 * emails are registered (account-enumeration protection). The user is simply told
 * "if an account exists, we sent a link".
 */
export async function forgotPassword(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалиден имейл." };
  }
  const emailLower = parsed.data.email.toLowerCase();

  try {
    const db = getDb();
    const rows = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, emailLower))
      .limit(1);
    const user = rows[0];

    // Only send for a real password account; otherwise silently succeed.
    if (user && user.passwordHash) {
      // Invalidate any outstanding reset tokens for this user, then issue one.
      await db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, user.id));
      const token = newToken();
      await db.insert(schema.passwordResetTokens).values({
        token,
        userId: user.id,
        expires: resetExpiry(),
      });
      await sendPasswordResetEmail(user.email, token, user.name ?? undefined);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[forgot-password] failed", error);
    // Still return success to the user (don't leak); the error is logged.
    return { success: true, data: undefined };
  }
}
