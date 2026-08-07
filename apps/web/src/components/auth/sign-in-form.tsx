"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { Button } from "@/components/common";
import { useLastAuthMethod } from "@/hooks/use-last-auth-method";
import { credentialsSignIn } from "@/mutations/auth";
import { signInSchema, type SignInValues } from "@/schemas/auth.schema";
import {
  AUTH_ERROR_BOX_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
} from "./auth-styles";
import { GoogleButton } from "./google-button";
import { LastUsedBadge } from "./last-used-badge";

/** `aria-describedby` targets for the «Последно използвано» badge. Only one of the
 *  two ever renders (the hook returns a single method), but distinct ids keep the
 *  association unambiguous. */
const GOOGLE_HINT_ID = "last-used-google";
const CREDENTIALS_HINT_ID = "last-used-credentials";

/**
 * Email/password sign-in form + Google button. On success it refetches the
 * Auth.js session — the sign-in ran through a Server Action, so the client
 * SessionProvider doesn't otherwise learn about the cookie it just set — then
 * navigates to `redirectTo`. Errors (wrong credentials, unverified email) surface
 * in the status box from the server action's result.
 *
 * Whichever method this browser last signed in with gets a «Последно използвано»
 * badge + brand ring, so returning users don't have to remember whether they used
 * Google or a password (with `allowDangerousEmailAccountLinking` both can exist on
 * one email). The marker is client-only — it appears right after hydration and,
 * being absolutely positioned, shifts nothing.
 */
export function SignInForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const { update } = useSession();
  const lastMethod = useLastAuthMethod();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    setError(null);
    const result = await credentialsSignIn(values);
    if (result.success) {
      // Force the client SessionProvider to refetch /api/auth/session so it picks
      // up the JWT cookie the Server Action set; without this the header auth
      // controls + favourites provider stay "signed out" until a tab refocus or
      // full reload (the provider only refetches on mount/focus/its own signIn()).
      await update();
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="grid gap-4">
      {/* `relative` host for the badge — it must be a SIBLING of the button, which
          is overflow-hidden for its ripple and would clip an overlapping pill. */}
      <div className="relative">
        <GoogleButton
          redirectTo={redirectTo}
          highlighted={lastMethod === "google"}
          describedBy={lastMethod === "google" ? GOOGLE_HINT_ID : undefined}
        />
        {lastMethod === "google" ? <LastUsedBadge id={GOOGLE_HINT_ID} /> : null}
      </div>

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />
        или
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5">
        <div className="grid gap-1.5">
          <label htmlFor="signin-email" className="text-sm font-bold text-ink">
            Имейл
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            className={AUTH_INPUT_CLASS}
            {...register("email")}
          />
          {errors.email?.message ? (
            <span className="text-xs font-semibold text-[#b53b2f]">{errors.email.message}</span>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="signin-password" className="text-sm font-bold text-ink">
              Парола
            </label>
            <Link href="/zabravena-parola" className="text-xs font-semibold text-brand-dark hover:underline">
              Забравена парола?
            </Link>
          </div>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={AUTH_INPUT_CLASS}
            {...register("password")}
          />
          {errors.password?.message ? (
            <span className="text-xs font-semibold text-[#b53b2f]">{errors.password.message}</span>
          ) : null}
        </div>

        {error ? <div className={AUTH_ERROR_BOX_CLASS}>{error}</div> : null}

        <div className="relative">
          <Button
            type="submit"
            disabled={isSubmitting}
            rippleTheme="light"
            aria-describedby={lastMethod === "credentials" ? CREDENTIALS_HINT_ID : undefined}
            // Offset ring: a flush brand ring would vanish against the button's
            // own orange gradient.
            className={`${AUTH_PRIMARY_BTN_CLASS} ${
              lastMethod === "credentials" ? "ring-2 ring-brand/40 ring-offset-2 ring-offset-white" : ""
            }`}
          >
            Вход
          </Button>
          {lastMethod === "credentials" ? <LastUsedBadge id={CREDENTIALS_HINT_ID} /> : null}
        </div>
      </form>

      <p className="text-center text-sm text-muted">
        Нямате профил?{" "}
        <Link href="/registratsiya" className="font-bold text-brand-dark hover:underline">
          Регистрация
        </Link>
      </p>
    </div>
  );
}
