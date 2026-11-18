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
import { AuthAlert, AuthField, fieldErrorProps } from "./auth-field";
import { GoogleButton } from "./google-button";
import { LastUsedBadge } from "./last-used-badge";
import { PasswordInput } from "./password-input";

/** `aria-describedby` targets for the «Последно използвано» badge. Only one of the
 *  two ever renders (the hook returns a single method), but distinct ids keep the
 *  association unambiguous. */
const GOOGLE_HINT_ID = "last-used-google";
const CREDENTIALS_HINT_ID = "last-used-credentials";

/**
 * Email/password sign-in form + Google button (boards `ac-signin`, `ac-signin-st`). On success it refetches the
 * Auth.js session — the sign-in ran through a Server Action, so the client SessionProvider doesn't otherwise learn
 * about the cookie it just set — then navigates to `redirectTo`. Errors (wrong credentials, unverified email) show in
 * the alert above the button, from the server action's result.
 *
 * Whichever method this browser last signed in with gets a «Последно използвано» badge and a ring, so returning users
 * don't have to remember whether they used Google or a password (with `allowDangerousEmailAccountLinking` both can
 * exist on one email). The marker is client-only: it appears right after hydration and, positioned on the control's
 * edge, shifts nothing. The chamfered „Вход" can't take an outline or a box-shadow (its clip-path cuts them), so its
 * ring is drawn by `.ac-ring` around it.
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

  const submit = (
    <Button
      type="submit"
      variant="pri"
      block
      busy={isSubmitting}
      disabled={isSubmitting}
      aria-describedby={lastMethod === "credentials" ? CREDENTIALS_HINT_ID : undefined}
      // While sending, the button keeps its full strength (the kit dims a disabled one).
      className="opacity-100"
    >
      Вход
    </Button>
  );

  return (
    <>
      <div className={`ac-lu ${lastMethod === "google" ? "ac-lu--g" : ""}`}>
        <GoogleButton redirectTo={redirectTo} describedBy={lastMethod === "google" ? GOOGLE_HINT_ID : undefined} />
        {lastMethod === "google" ? <LastUsedBadge id={GOOGLE_HINT_ID} /> : null}
      </div>

      <div className="ac-or">или</div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="sa-form">
        <AuthField id="signin-email" label="Имейл" error={errors.email?.message}>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            className={`sa-in ${errors.email ? "is-err" : ""}`}
            {...fieldErrorProps("signin-email", errors.email?.message)}
            {...register("email")}
          />
        </AuthField>

        <AuthField
          id="signin-password"
          label="Парола"
          error={errors.password?.message}
          aside={
            <Link href="/zabravena-parola" className="ac-lnk">
              Забравена парола?
            </Link>
          }
        >
          <PasswordInput
            id="signin-password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={errors.password ? "is-err" : ""}
            {...fieldErrorProps("signin-password", errors.password?.message)}
            {...register("password")}
          />
        </AuthField>

        {error ? <AuthAlert tone="neg">{error}</AuthAlert> : null}

        <div className="ac-lu">
          {lastMethod === "credentials" ? <div className="ac-ring">{submit}</div> : submit}
          {lastMethod === "credentials" ? <LastUsedBadge id={CREDENTIALS_HINT_ID} /> : null}
        </div>
      </form>

      <p className="ac-alt">
        Нямате профил? <Link href="/registratsiya">Регистрация</Link>
      </p>
    </>
  );
}
