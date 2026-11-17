"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Pending-aware navigation for the catalog filter bar → results grid.
 *
 * WHY this exists: touching a filter applies via `router.replace` (a soft,
 * same-route navigation). That is a React transition, and a transition
 * DELIBERATELY keeps the currently-committed UI on screen and SUPPRESSES the
 * `<Suspense fallback>` skeleton while the new server payload is fetched — and
 * `loading.tsx` only streams on a HARD load, never a param-only change. The net
 * effect was a grid that sat frozen for the whole (dynamic, DB-backed) server
 * round-trip with zero feedback, then swapped in one jump. Users read that as
 * "nothing happened… then it randomly refreshed."
 *
 * The fix is to make that pending state observable. `navigate` wraps the
 * `router.replace` in an explicit `useTransition`, so `pending` stays true for
 * the entire async navigation; each stale card frosts under its own glass panel
 * (see CardGlass) while it's set. `setSoftPending` covers the ~1.5s TEXT-DEBOUNCE gap in the filter bar
 * (year/price/VIN inputs), where the navigation hasn't fired yet but the user's
 * input is already "in flight" — otherwise typing in those fields would feel
 * just as dead as before until the debounce elapsed.
 *
 * `reset` clears every filter from outside the filter bar: the empty results'
 * „Изчистете филтрите" (board `ct-empty`). The filter bar registers it, because only
 * the bar knows its draft and its pending text apply, which must be cancelled too.
 *
 * Default value is a no-op so `useFilterNav()` is SAFE outside a provider: the
 * brand/model hub pages render `AllCarsGrid` with NO filter bar and no provider,
 * and their grid must simply read `pending: false` and `reset: null`.
 */
type FilterNavValue = {
  /** True while a filter navigation is in flight OR text input is mid-debounce. */
  pending: boolean;
  /** Apply filters: soft navigate (replace) to `href`, wrapped in a transition. */
  navigate: (href: string) => void;
  /** Mark pending immediately (debounced text inputs, before the nav fires). */
  setSoftPending: () => void;
  /** Clear the filters, as the bar's own button does; null when no filter bar is mounted. */
  reset: (() => void) | null;
  /** The filter bar registers its reset on mount, and null on unmount. */
  registerReset: (fn: (() => void) | null) => void;
};

const NOOP_VALUE: FilterNavValue = {
  pending: false,
  navigate: () => {},
  setSoftPending: () => {},
  reset: null,
  registerReset: () => {},
};

const FilterNavContext = createContext<FilterNavValue>(NOOP_VALUE);

export function useFilterNav(): FilterNavValue {
  return useContext(FilterNavContext);
}

export function FilterNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // The navigation's own pending flag. `router.replace` triggers an async RSC
  // navigation; wrapping it in a transition keeps `isNavigating` true until that
  // navigation commits, which is exactly the window we want feedback for.
  const [isNavigating, startTransition] = useTransition();
  // Bridges the text-debounce gap: set on keystroke, cleared when the debounced
  // navigation actually fires (which then flips `isNavigating` on) — so `pending`
  // never blinks off between the two.
  const [soft, setSoft] = useState(false);

  const navigate = useCallback(
    (href: string) => {
      setSoft(false);
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [router],
  );

  const setSoftPending = useCallback(() => setSoft(true), []);

  // The bar's reset lives in a ref (it changes every render); `canReset` only says whether one is registered.
  const resetRef = useRef<(() => void) | null>(null);
  const [canReset, setCanReset] = useState(false);
  const registerReset = useCallback((fn: (() => void) | null) => {
    resetRef.current = fn;
    setCanReset(fn !== null);
  }, []);
  const runReset = useCallback(() => resetRef.current?.(), []);

  const pending = isNavigating || soft;

  const value = useMemo<FilterNavValue>(
    () => ({ pending, navigate, setSoftPending, reset: canReset ? runReset : null, registerReset }),
    [pending, navigate, setSoftPending, canReset, runReset, registerReset],
  );

  return <FilterNavContext.Provider value={value}>{children}</FilterNavContext.Provider>;
}
