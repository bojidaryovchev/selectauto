"use server";

import { hash } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { resetPasswordSchema } from "@/schemas/auth.schema";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Completes a password reset: validate the (non-expired) reset token, hash the
 * new password, update the user, and consume the token (single-use). Also marks
 * the email verified if it somehow wasn't (a user proving control of their inbox
 * via the reset link is at least as strong as the verify link).
 *
 * Generic error for bad/expired tokens.
 */
export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  }
  const { token, password } = parsed.data;

  try {
    const db = getDb();

    const rows = await db
      .select()
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.token, token),
          gt(schema.passwordResetTokens.expires, new Date()),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { success: false, error: "Линкът за смяна на парола е невалиден или изтекъл." };
    }

    const passwordHash = await hash(password, 12);
    await db
      .update(schema.users)
      .set({ passwordHash, emailVerified: new Date() })
      .where(eq(schema.users.id, row.userId));

    // Consume the token (single-use).
    await db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.token, token));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[reset-password] failed", error);
    return { success: false, error: "Възникна грешка. Моля опитайте отново." };
  }
}
