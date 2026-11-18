import { LinkButton } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import { AuthCard } from "./auth-card";

/**
 * Body of the /greshka-pri-vhod page — the branded replacement for Auth.js's raw
 * `/api/auth/error` card (boards `ac-autherr`, `ac-autherr-st`). Auth.js redirects here (via `pages.error` in
 * auth.config.ts) whenever an auth flow fails, passing the reason as `?error=`.
 *
 * Note the `Configuration` case: Auth.js relabels ANY error it doesn't consider
 * "client-safe" as `Configuration` (see @auth/core index.js — `isClientError`).
 * The most common trigger here is a user CANCELLING the Google account chooser:
 * the OAuth callback then can't complete the state/PKCE check, which surfaces as
 * `Configuration` rather than a friendlier code. So we treat it as "sign-in didn't
 * complete" (retry) rather than a scary "server error" — accurate for a cancel,
 * a timed-out attempt, or a genuine transient hiccup alike.
 */
type ErrorCopy = { title: string; message: string };

const NOT_COMPLETED: ErrorCopy = {
  title: "Влизането не бе завършено",
  message:
    "Процесът по вход не беше завършен. Това може да се случи, ако сте прекъснали избора на профил в Google или сесията е изтекла. Опитайте отново.",
};

const ERROR_COPY: Record<string, ErrorCopy> = {
  // "Not client-safe" errors Auth.js collapses to Configuration (incl. a cancelled
  // Google chooser) and the explicit OAuth callback/sign-in failures — all "retry".
  Configuration: NOT_COMPLETED,
  OAuthSignin: NOT_COMPLETED,
  OAuthCallback: NOT_COMPLETED,
  OAuthCallbackError: NOT_COMPLETED,
  AccessDenied: {
    title: "Достъпът е отказан",
    message:
      "Нямате разрешение да влезете с този профил. Опитайте с друг профил или се свържете с нас.",
  },
  OAuthAccountNotLinked: {
    title: "Имейлът вече се използва",
    message:
      "Този имейл вече е свързан с друг начин за вход. Влезте по начина, който сте използвали първоначално.",
  },
  Verification: {
    title: "Линкът е невалиден",
    message:
      "Този линк за вход вече е използван или е изтекъл. Поискайте нов и опитайте отново.",
  },
};

const DEFAULT_COPY: ErrorCopy = {
  title: "Възникна грешка при входа",
  message: "Нещо се обърка при опита за вход. Моля, опитайте отново.",
};

export function AuthErrorContent({ error }: { error?: string }) {
  const { title, message } = (error && ERROR_COPY[error]) || DEFAULT_COPY;

  return (
    <AuthCard
      centered
      title={title}
      icon={
        <span className="ac-eic" aria-hidden="true">
          <AlertIcon />
        </span>
      }
    >
      <p className="ac-msg">{message}</p>
      <div className="ac-acts">
        <LinkButton href="/sign-in" variant="pri" block>
          Опитайте отново
        </LinkButton>
        <LinkButton href="/" variant="txt">
          Към началото
        </LinkButton>
      </div>
    </AuthCard>
  );
}

/** The sign-in error card while the page reads its address (`ac-autherr-st` 6), named „Зареждане". */
export function AuthErrorSkeleton() {
  return (
    <section className="ac-card ac-card--c" aria-busy="true" aria-label="Зареждане">
      <div className="ac-sk w-full items-center">
        <div className="sa-sk size-16 rounded-full" />
        <div className="sa-sk h-6.5 w-[70%]" />
        <div className="sa-sk h-3 w-[90%]" />
        <div className="sa-sk h-3 w-[80%]" />
        <div className="sa-sk mt-3 h-12 w-full rounded-md" />
      </div>
    </section>
  );
}
