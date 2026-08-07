"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { rememberAuthMethod } from "@/hooks/use-last-auth-method";

/**
 * Records the sign-in method that actually worked, for the «Последно използвано»
 * badge on /sign-in. Renders nothing; mounted once app-wide in <Providers> (which
 * sits inside the root layout's <SessionProvider>).
 *
 * Why it lives here and not in the buttons: the Google flow REDIRECTS away
 * (server action → Google → /api/auth/callback/google → redirectTo), so no
 * client code on /sign-in survives to see whether it succeeded. Writing on click
 * would mark Google even for a user who cancels at the chooser. Instead
 * `session.user.authProvider` carries the provider back on the JWT (stamped in
 * auth.ts's `jwt` callback), so by the time a session exists — anywhere in the
 * app — we know for a fact which method minted it. The credentials flow lands
 * here too: sign-in-form.tsx calls `update()` before navigating.
 *
 * Sessions issued before this shipped carry no `provider` claim; they simply
 * no-op until the user next signs in.
 */
export function RememberAuthMethod() {
  const { data: session, status } = useSession();
  const provider = session?.user.authProvider;

  useEffect(() => {
    if (status !== "authenticated") return;
    rememberAuthMethod(provider);
  }, [status, provider]);

  return null;
}
