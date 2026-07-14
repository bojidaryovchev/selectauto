"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { signUp } from "@/mutations/auth";
import { signUpSchema, type SignUpValues } from "@/schemas/auth.schema";
import {
  AUTH_ERROR_BOX_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AUTH_SUCCESS_BOX_CLASS,
} from "./auth-styles";
import { GoogleButton } from "./google-button";

/**
 * Registration form (Google + email/password). On a successful email sign-up it
 * shows a "check your inbox" confirmation rather than logging in — the account is
 * unverified until the user clicks the emailed link.
 */
export function SignUpForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignUpValues) {
    setError(null);
    const result = await signUp(values);
    if (result.success) {
      setDone(true);
    } else {
      setError(result.error);
    }
  }

  if (done) {
    return (
      <div className={AUTH_SUCCESS_BOX_CLASS}>
        Изпратихме линк за потвърждение на имейла ви. Отворете го, за да активирате профила си и да влезете.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <GoogleButton redirectTo={redirectTo} />

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" />
        или
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5">
        <div className="grid gap-1.5">
          <label htmlFor="signup-name" className="text-sm font-bold text-ink">
            Име
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Вашето име"
            className={AUTH_INPUT_CLASS}
            {...register("name")}
          />
          {errors.name?.message ? (
            <span className="text-xs font-semibold text-[#b53b2f]">{errors.name.message}</span>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="signup-email" className="text-sm font-bold text-ink">
            Имейл
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="text-sm font-bold text-ink">
            Парола
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Поне 8 символа"
            className={AUTH_INPUT_CLASS}
            {...register("password")}
          />
          {errors.password?.message ? (
            <span className="text-xs font-semibold text-[#b53b2f]">{errors.password.message}</span>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="signup-confirm-password" className="text-sm font-bold text-ink">
            Потвърдете паролата
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Повторете паролата"
            className={AUTH_INPUT_CLASS}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword?.message ? (
            <span className="text-xs font-semibold text-[#b53b2f]">{errors.confirmPassword.message}</span>
          ) : null}
        </div>

        {error ? <div className={AUTH_ERROR_BOX_CLASS}>{error}</div> : null}

        <Button type="submit" disabled={isSubmitting} rippleTheme="light" className={AUTH_PRIMARY_BTN_CLASS}>
          Регистрация
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Вече имате профил?{" "}
        <Link href="/sign-in" className="font-bold text-brand-dark hover:underline">
          Вход
        </Link>
      </p>
    </div>
  );
}
