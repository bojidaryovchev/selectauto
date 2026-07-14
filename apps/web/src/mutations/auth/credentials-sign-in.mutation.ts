"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { signInSchema } from "@/schemas/auth.schema";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Email/password sign-in. Wraps Auth.js `signIn("credentials")` so the client
 * form can submit via a Server Action and branch on the result.
 *
 * `redirect: false` keeps control here (we return an ActionResult instead of
 * letting Auth.js throw a redirect). On success the JWT cookie is set; the client
 * then refetches the session and navigates. We map Auth.js's errors to BG messages:
 *  - the `authorize` throwing "EMAIL_NOT_VERIFIED" → a specific prompt,
 *  - any other CredentialsSignin → generic "wrong email or password" (no leak).
 *
 * TODO(security): no rate limiting yet on this or the other auth actions
 * (sign-up / forgot-password) — a shared store (Upstash Redis / Vercel KV) is
 * needed because Vercel serverless instances don't share in-memory state. Until
 * then password-guessing and verification-email bombing are unthrottled.
 */
export async function credentialsSignIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Невалиден имейл или парола." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      // The `authorize` callback throws a plain Error("EMAIL_NOT_VERIFIED"), which
      // Auth.js wraps; its message surfaces on the CallbackRouteError cause.
      const cause = (error.cause as { err?: Error } | undefined)?.err;
      if (cause?.message === "EMAIL_NOT_VERIFIED") {
        return {
          success: false,
          error: "Имейлът ви не е потвърден. Проверете пощата си за линк за активиране.",
        };
      }
      if (error.type === "CredentialsSignin") {
        return { success: false, error: "Грешен имейл или парола." };
      }
    }
    console.error("[credentials-sign-in] failed", error);
    return { success: false, error: "Възникна грешка при входа. Моля опитайте отново." };
  }
}
