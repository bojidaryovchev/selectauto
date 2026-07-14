"use server";

import { hash } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newToken, newUserId, verificationExpiry } from "@/lib/auth-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { signUpSchema } from "@/schemas/auth.schema";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Registers a new email/password user and sends a verification email.
 *
 * Auth.js's Credentials provider does none of this, so we own it: validate →
 * hash the password (bcrypt) → insert a `users` row with `emailVerified = NULL`
 * (so sign-in is blocked until verified) → issue a verification token → email the
 * link via Resend. The user can't sign in until they click it.
 *
 * To avoid leaking which emails are registered, an already-taken email returns a
 * generic "check your inbox" success WITHOUT creating a duplicate or resending —
 * the same outward result as a fresh sign-up.
 */
export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  }
  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  try {
    const db = getDb();

    // Already registered? Return the neutral success (no enumeration, no dup).
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, emailLower))
      .limit(1);
    if (existing.length > 0) {
      return { success: true, data: undefined };
    }

    const passwordHash = await hash(password, 12);
    const userId = newUserId();

    await db.insert(schema.users).values({
      id: userId,
      name,
      email,
      passwordHash,
      emailVerified: null,
    });

    // Issue + persist a verification token keyed by email (Auth.js token shape).
    const token = newToken();
    await db.insert(schema.verificationTokens).values({
      identifier: emailLower,
      token,
      expires: verificationExpiry(),
    });

    await sendVerificationEmail(email, token, name);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[sign-up] failed", error);
    return { success: false, error: "Възникна грешка при регистрацията. Моля опитайте отново." };
  }
}
