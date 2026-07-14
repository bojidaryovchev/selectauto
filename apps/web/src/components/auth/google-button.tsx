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
 */
export function GoogleButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={isPending}
      rippleTheme="dark"
      onClick={() => startTransition(() => googleSignIn(redirectTo))}
      className="flex min-h-13.5 w-full items-center justify-center gap-3 rounded-[14px] border border-[#d9dde4] bg-white text-base font-bold text-[#17181b] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
    >
      <GoogleIcon className="size-5" />
      Продължи с Google
    </Button>
  );
}
