"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { forgotPassword } from "@/mutations/auth";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/schemas/auth.schema";
import {
  AUTH_ERROR_BOX_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AUTH_SUCCESS_BOX_CLASS,
} from "./auth-styles";

/**
 * "Forgot password" form. Always shows the same neutral confirmation on submit
 * (the action never reveals whether the email is registered), so the UI can't be
 * used to enumerate accounts.
 */
export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setError(null);
    const result = await forgotPassword(values);
    if (result.success) setDone(true);
    else setError(result.error);
  }

  if (done) {
    return (
      <div className={AUTH_SUCCESS_BOX_CLASS}>
        Ако съществува профил с този имейл, изпратихме линк за смяна на паролата. Проверете пощата си.
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5">
      <div className="grid gap-1.5">
        <label htmlFor="forgot-email" className="text-sm font-bold text-ink">
          Имейл
        </label>
        <input
          id="forgot-email"
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

      {error ? <div className={AUTH_ERROR_BOX_CLASS}>{error}</div> : null}

      <Button type="submit" disabled={isSubmitting} rippleTheme="light" className={AUTH_PRIMARY_BTN_CLASS}>
        Изпрати линк
      </Button>

      <p className="text-center text-sm text-muted">
        <Link href="/sign-in" className="font-bold text-brand-dark hover:underline">
          Назад към вход
        </Link>
      </p>
    </form>
  );
}
