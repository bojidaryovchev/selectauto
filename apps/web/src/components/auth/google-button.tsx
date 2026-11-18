"use client";

import { useTransition } from "react";
import { Button } from "@/components/common";
import { GoogleIcon } from "@/components/icons";
import { googleSignIn } from "@/mutations/auth";

/**
 * „Продължете с Google". Calls the `googleSignIn` server action, which triggers Auth.js's OAuth redirect (the action
 * throws a redirect — expected, so we don't await a return value). `redirectTo` returns the user to where they
 * started after the round-trip. While the browser leaves for Google, the button waits with a spinner in place of the
 * mark (`ac-signin-st` 7).
 *
 * `describedBy` points at the „Последно използвано" badge when Google was this browser's last method; the ring around
 * the button comes from the wrapper (`.ac-lu--g`, see sign-in-form.tsx).
 */
export function GoogleButton({ redirectTo = "/", describedBy }: { redirectTo?: string; describedBy?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="sec"
      block
      busy={isPending}
      disabled={isPending}
      aria-describedby={describedBy}
      onClick={() => startTransition(() => googleSignIn(redirectTo))}
      // While it waits, the button keeps its full strength (the kit dims a disabled one).
      className="opacity-100"
    >
      {isPending ? null : <GoogleIcon />}
      Продължете с Google
    </Button>
  );
}
