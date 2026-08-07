"use client";

import { useTransition } from "react";
import { Button } from "@/components/common";
import { GoogleIcon } from "@/components/icons";
import { googleSignIn } from "@/mutations/auth";

/**
 * "Continue with Google" button. Calls the `googleSignIn` server action, which
 * triggers Auth.js's OAuth redirect (the action throws a redirect — expected, so
 * we don't await a return value). `redirectTo` returns the user to where they
 * started after the round-trip.
 *
 * `highlighted` draws the brand ring used when this was the last method the
 * browser signed in with, and `describedBy` points at the <LastUsedBadge> that
 * accompanies it (see sign-in-form.tsx). Both are inert on /registratsiya, where
 * a "last used" hint makes no sense.
 */
export function GoogleButton({
  redirectTo = "/",
  highlighted = false,
  describedBy,
}: {
  redirectTo?: string;
  highlighted?: boolean;
  describedBy?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      rippleTheme="dark"
      aria-describedby={describedBy}
      onClick={() => startTransition(() => googleSignIn(redirectTo))}
      className={`flex min-h-13.5 w-full items-center justify-center gap-3 rounded-[14px] border bg-white text-base font-bold text-[#17181b] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70 ${
        highlighted ? "border-brand ring-2 ring-brand/25" : "border-[#d9dde4]"
      }`}
    >
      <GoogleIcon className="size-5" />
      Продължи с Google
    </Button>
  );
}
