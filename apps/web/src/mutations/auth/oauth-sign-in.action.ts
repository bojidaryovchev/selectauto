"use server";

import { signIn, signOut } from "@/auth";

/**
 * Google sign-in. A Server Action that triggers the OAuth redirect flow; Auth.js
 * throws a redirect internally (do NOT catch it — let it propagate so the browser
 * navigates to Google). `redirectTo` brings the user back to where they were.
 */
export async function googleSignIn(redirectTo: string = "/") {
  await signIn("google", { redirectTo });
}

/** Sign the current user out and return to the homepage. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
