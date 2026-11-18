"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, LinkButton } from "@/components/common";
import { resetPassword } from "@/mutations/auth";
import { resetPasswordSchema, type ResetPasswordValues } from "@/schemas/auth.schema";
import { AuthAlert, AuthField, fieldErrorProps } from "./auth-field";
import { PasswordInput } from "./password-input";

/**
 * Reset-password form (boards `ac-reset`, `ac-reset-st`). The `token` comes from the email link (the page reads it
 * from the URL and passes it in). On success it confirms and offers „Към вход".
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
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setError(null);
    const result = await resetPassword(values);
    if (result.success) setDone(true);
    else setError(result.error);
  }

  if (done) {
    return (
      <div className="ac-acts">
        <AuthAlert tone="pos">Паролата е сменена успешно.</AuthAlert>
        <LinkButton href="/sign-in" variant="pri" block>
          Към вход
        </LinkButton>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="sa-form">
      {/* token is a hidden registered field so it's part of the validated payload */}
      <input type="hidden" {...register("token")} />

      <AuthField id="reset-password" label="Нова парола" error={errors.password?.message}>
        <PasswordInput
          id="reset-password"
          autoComplete="new-password"
          placeholder="Поне 8 символа"
          className={errors.password ? "is-err" : ""}
          {...fieldErrorProps("reset-password", errors.password?.message)}
          {...register("password")}
        />
      </AuthField>

      <AuthField id="reset-confirm-password" label="Потвърдете паролата" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="reset-confirm-password"
          autoComplete="new-password"
          placeholder="Повторете паролата"
          className={errors.confirmPassword ? "is-err" : ""}
          {...fieldErrorProps("reset-confirm-password", errors.confirmPassword?.message)}
          {...register("confirmPassword")}
        />
      </AuthField>

      {error ? <AuthAlert tone="neg">{error}</AuthAlert> : null}

      {/* While sending, the button keeps its full strength (the kit dims a disabled one). */}
      <Button type="submit" variant="pri" block busy={isSubmitting} disabled={isSubmitting} className="opacity-100">
        Сменете паролата
      </Button>
    </form>
  );
}
