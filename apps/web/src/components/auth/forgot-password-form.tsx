"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, LinkButton } from "@/components/common";
import { forgotPassword } from "@/mutations/auth";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/schemas/auth.schema";
import { AuthAlert, AuthField, fieldErrorProps } from "./auth-field";

/**
 * "Forgot password" form (boards `ac-forgot`, `ac-forgot-st`). Always shows the same neutral confirmation on submit
 * (the action never reveals whether the email is registered), so the UI can't be used to enumerate accounts.
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
      <AuthAlert tone="pos">
        Ако съществува профил с този имейл, изпратихме линк за смяна на паролата. Проверете пощата си.
      </AuthAlert>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="sa-form">
      <AuthField id="forgot-email" label="Имейл" error={errors.email?.message}>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          className={`sa-in ${errors.email ? "is-err" : ""}`}
          {...fieldErrorProps("forgot-email", errors.email?.message)}
          {...register("email")}
        />
      </AuthField>

      {error ? <AuthAlert tone="neg">{error}</AuthAlert> : null}

      {/* While sending, the button keeps its full strength (the kit dims a disabled one). */}
      <Button type="submit" variant="pri" block busy={isSubmitting} disabled={isSubmitting} className="opacity-100">
        Изпратете линк
      </Button>

      <LinkButton href="/sign-in" variant="txt" className="ac-back">
        Назад към вход
      </LinkButton>
    </form>
  );
}
