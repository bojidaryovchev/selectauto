"use client";

import { useEffect, useRef, useState } from "react";
import { LinkButton } from "@/components/common";
import { verifyEmail } from "@/mutations/auth";
import { AuthAlert } from "./auth-field";

/**
 * Runs the email-verification once on mount with the token from the URL, then shows the outcome (boards `ac-verify`,
 * `ac-verify-st`). A ref guards against the effect firing twice (React strict mode / remounts) consuming a
 * single-use token on the first try and then reporting failure on the second.
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
    return (
      <div className="ac-wait" role="status">
        <span className="sa-spin" aria-hidden="true" />
        Потвърждаваме имейла ви…
      </div>
    );
  }

  if (state === "ok") {
    return (
      <div className="ac-acts">
        <AuthAlert tone="pos">Имейлът ви е потвърден успешно. Вече можете да влезете.</AuthAlert>
        <LinkButton href="/sign-in" variant="pri" block>
          Към вход
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="ac-acts">
      <AuthAlert tone="neg">
        Линкът за потвърждение е невалиден или изтекъл. Опитайте да се регистрирате отново или влезте, ако вече сте
        потвърдили.
      </AuthAlert>
      <LinkButton href="/sign-in" variant="sec" block>
        Към вход
      </LinkButton>
    </div>
  );
}
