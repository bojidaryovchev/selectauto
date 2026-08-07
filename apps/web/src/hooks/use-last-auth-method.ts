import { useSyncExternalStore } from "react";

/**
 * "Which sign-in method did this browser last use successfully?" — the state
 * behind the «Последно използвано» badge on /sign-in.
 *
 * Stored in `localStorage` (NOT sessionStorage — unlike the Viber popup's
 * dismissal flag, the whole point is to survive across visits) and read through
 * `useSyncExternalStore`, the same pattern as `useMounted` and the Viber popup:
 * the SERVER snapshot is `null`, so the prerendered static shell contains no
 * badge and React swaps in the real value after hydration without a mismatch
 * warning. The badge is absolutely positioned, so appearing a frame late costs
 * no layout shift.
 *
 * WRITES happen in `components/auth/remember-auth-method.tsx`, off the provider
 * that Auth.js stamps onto the JWT at sign-in — never off a click, so a user who
 * bails at the Google chooser (or lands on /greshka-pri-vhod) records nothing.
 */

/** The sign-in methods the badge can point at — Auth.js provider ids. */
export type AuthMethod = "google" | "credentials";

const STORAGE_KEY = "sa-last-auth-method";
/** Same-tab notification; cross-tab is covered by the native `storage` event. */
const CHANGE_EVENT = "sa:last-auth-method";

function isAuthMethod(value: string | null | undefined): value is AuthMethod {
  return value === "google" || value === "credentials";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  // Fires in OTHER tabs only — keeps a second open tab's badge in sync.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): AuthMethod | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isAuthMethod(value) ? value : null;
  } catch {
    // Private mode / storage disabled — just never show the badge.
    return null;
  }
}

/** SSR + static prerender: no badge (there is no browser storage to read yet). */
function getServerSnapshot(): AuthMethod | null {
  return null;
}

export function useLastAuthMethod(): AuthMethod | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Records the method that just signed the user in. Takes the raw Auth.js provider
 * id and ignores anything we don't render a badge for, so a future provider can't
 * write a value the reader would then discard. No-ops (and skips the event) when
 * the value is unchanged, so it can be called on every session render.
 */
export function rememberAuthMethod(provider: string | undefined): void {
  if (!isAuthMethod(provider)) return;
  try {
    if (localStorage.getItem(STORAGE_KEY) === provider) return;
    localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
