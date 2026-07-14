"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { resetPassword } from "@/mutations/auth";
import { resetPasswordSchema, type ResetPasswordValues } from "@/schemas/auth.schema";
import {
  AUTH_ERROR_BOX_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AUTH_SUCCESS_BOX_CLASS,
} from "./auth-styles";

/**
 * Reset-password form. The `token` comes from the email link (the page reads it
 * from the URL and passes it in). On success it confirms and links to sign-in.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setError(null);
    const result = await resetPassword(values);
    if (result.success) setDone(true);
    else setError(result.error);
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <div className={AUTH_SUCCESS_BOX_CLASS}>Паролата е сменена успешно.</div>
        <Link
          href="/sign-in"
          className="inline-flex min-h-13.5 items-center justify-center rounded-[14px] bg-linear-to-r from-brand-dark to-brand px-6 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Към вход
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5">
      {/* token is a hidden registered field so it's part of the validated payload */}
      <input type="hidden" {...register("token")} />

      <div className="grid gap-1.5">
        <label htmlFor="reset-password" className="text-sm font-bold text-ink">
          Нова парола
        </label>
        <input
          id="reset-password"
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

      {error ? <div className={AUTH_ERROR_BOX_CLASS}>{error}</div> : null}

      <Button type="submit" disabled={isSubmitting} rippleTheme="light" className={AUTH_PRIMARY_BTN_CLASS}>
        Смени паролата
      </Button>
    </form>
  );
}
