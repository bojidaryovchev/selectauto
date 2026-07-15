"use server";

import { signIn } from "@/auth";

/**
 * Google sign-in. A Server Action that triggers the OAuth redirect flow; Auth.js
 * throws a redirect internally (do NOT catch it — let it propagate so the browser
 * navigates to Google). `redirectTo` brings the user back to where they were.
 *
 * Sign-OUT is deliberately NOT a Server Action: it runs client-side via
 * `signOut()` from next-auth/react in `components/auth/user-menu.tsx`, so the
 * SessionProvider updates and the header reflects it without a reload.
 */
export async function googleSignIn(redirectTo: string = "/") {
  await signIn("google", { redirectTo });
}
