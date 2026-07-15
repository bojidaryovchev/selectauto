import Link from "next/link";
import { LinkButton } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import { AUTH_PRIMARY_BTN_CLASS } from "./auth-styles";

/**
 * Body of the /greshka-pri-vhod page — the branded replacement for Auth.js's raw
 * `/api/auth/error` card. Auth.js redirects here (via `pages.error` in
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
    <div className="w-full max-w-110 rounded-[22px] border border-line bg-white p-8 text-center shadow-card max-md:p-6">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand-dark">
        <AlertIcon className="size-7" />
      </div>

      <h1 className="mb-2 text-2xl font-black uppercase tracking-tight text-ink">{title}</h1>
      <p className="mx-auto mb-7 max-w-88 text-sm/relaxed text-muted">{message}</p>

      <div className="grid gap-3">
        <LinkButton
          href="/sign-in"
          rippleTheme="light"
          className={`flex items-center justify-center ${AUTH_PRIMARY_BTN_CLASS}`}
        >
          Опитайте отново
        </LinkButton>
        <Link
          href="/"
          className="text-sm font-bold text-brand-dark transition-colors hover:underline"
        >
          Към началото
        </Link>
      </div>
    </div>
  );
}
