"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/common";
import { PrivacyNote } from "@/components/legal/privacy-note";
import { signUp } from "@/mutations/auth";
import { signUpSchema, type SignUpValues } from "@/schemas/auth.schema";
import { AuthAlert, AuthField, fieldErrorProps } from "./auth-field";
import { GoogleButton } from "./google-button";
import { PasswordInput } from "./password-input";

/**
 * Registration form (Google + email/password; boards `ac-register`, `ac-register-st`). On a successful email sign-up
 * the form is replaced by a "check your inbox" confirmation rather than logging in — the account is unverified until
 * the user clicks the emailed link. Both password fields have the eye button.
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
      <AuthAlert tone="pos">
        Изпратихме линк за потвърждение на имейла ви. Отворете го, за да активирате профила си и да влезете.
      </AuthAlert>
    );
  }

  return (
    <>
      <GoogleButton redirectTo={redirectTo} />

      <div className="ac-or">или</div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="sa-form">
        <AuthField id="signup-name" label="Име" error={errors.name?.message}>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Вашето име"
            className={`sa-in ${errors.name ? "is-err" : ""}`}
            {...fieldErrorProps("signup-name", errors.name?.message)}
            {...register("name")}
          />
        </AuthField>

        <AuthField id="signup-email" label="Имейл" error={errors.email?.message}>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            className={`sa-in ${errors.email ? "is-err" : ""}`}
            {...fieldErrorProps("signup-email", errors.email?.message)}
            {...register("email")}
          />
        </AuthField>

        <AuthField id="signup-password" label="Парола" error={errors.password?.message}>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            placeholder="Поне 8 символа"
            className={errors.password ? "is-err" : ""}
            {...fieldErrorProps("signup-password", errors.password?.message)}
            {...register("password")}
          />
        </AuthField>

        <AuthField id="signup-confirm-password" label="Потвърдете паролата" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="signup-confirm-password"
            autoComplete="new-password"
            placeholder="Повторете паролата"
            className={errors.confirmPassword ? "is-err" : ""}
            {...fieldErrorProps("signup-confirm-password", errors.confirmPassword?.message)}
            {...register("confirmPassword")}
          />
        </AuthField>

        {error ? <AuthAlert tone="neg">{error}</AuthAlert> : null}

        {/* While sending, the button keeps its full strength (the kit dims a disabled one). */}
        <Button type="submit" variant="pri" block busy={isSubmitting} disabled={isSubmitting} className="opacity-100">
          Регистрация
        </Button>
        <PrivacyNote />
      </form>

      <p className="ac-alt">
        Вече имате профил? <Link href="/sign-in">Вход</Link>
      </p>
    </>
  );
}
