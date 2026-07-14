"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { verifyEmail } from "@/mutations/auth";
import { AUTH_ERROR_BOX_CLASS, AUTH_SUCCESS_BOX_CLASS } from "./auth-styles";

/**
 * Runs the email-verification once on mount with the token from the URL, then
 * shows the outcome. A ref guards against the effect firing twice (React strict
 * mode / remounts) consuming a single-use token on the first try and then
 * reporting failure on the second.
 */
export function VerifyEmailClient({ token }: { token: string | null }) {
  // A missing token is an error we know at render time — no effect/setState needed
  // (and the lint rule forbids a synchronous setState in an effect). Only the
  // async verify path uses state.
  const [state, setState] = useState<"pending" | "ok" | "error">(token ? "pending" : "error");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;

    let cancelled = false;
    verifyEmail(token).then((result) => {
      if (cancelled) return;
      setState(result.success ? "ok" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "pending") {
    return <p className="text-sm text-muted">Потвърждаваме имейла ви…</p>;
  }

  if (state === "ok") {
    return (
      <div className="grid gap-4">
        <div className={AUTH_SUCCESS_BOX_CLASS}>Имейлът ви е потвърден успешно. Вече можете да влезете.</div>
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
    <div className="grid gap-4">
      <div className={AUTH_ERROR_BOX_CLASS}>
        Линкът за потвърждение е невалиден или изтекъл. Опитайте да се регистрирате отново или влезте, ако вече сте потвърдили.
      </div>
      <Link href="/sign-in" className="text-center text-sm font-bold text-brand-dark hover:underline">
        Към вход
      </Link>
    </div>
  );
}
