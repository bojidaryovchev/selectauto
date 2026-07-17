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
 * An already-registered email (password OR Google) is rejected with a clear
 * "account exists" error that steers them to sign-in / forgot-password, rather
 * than silently succeeding. This deliberately reveals that the email is taken —
 * a small account-enumeration tradeoff, but consistent with `authorize`
 * (auth.ts), which already surfaces OAUTH_ONLY / EMAIL_NOT_VERIFIED. Critically,
 * sign-up NEVER sets a password on an existing account: the submitter hasn't
 * proven inbox control, so letting them set a password on a verified Google
 * account would be an account-takeover primitive. Password-setting for an
 * existing account goes exclusively through forgot-password (which proves inbox
 * control via the emailed link).
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

    // Already registered? Reject clearly and steer to sign-in / forgot-password.
    // Never set a password here (see docstring): an existing account can only
    // gain a password through forgot-password, which proves inbox control.
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, emailLower))
      .limit(1);
    if (existing.length > 0) {
      return {
        success: false,
        error:
          'Вече съществува профил с този имейл. Влезте в профила си или използвайте „Забравена парола“, за да зададете парола.',
      };
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
