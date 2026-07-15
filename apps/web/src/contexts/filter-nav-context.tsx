"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
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
 * the entire async navigation; the grid frosts itself (a glass veil, see
 * AllCarsGrid) while it's set. `setSoftPending` covers the ~1.5s TEXT-DEBOUNCE gap in the filter bar
 * (year/price/VIN inputs), where the navigation hasn't fired yet but the user's
 * input is already "in flight" — otherwise typing in those fields would feel
 * just as dead as before until the debounce elapsed.
 *
 * Default value is a no-op so `useFilterNav()` is SAFE outside a provider: the
 * brand/model hub pages render `AllCarsGrid` with NO filter bar and no provider,
 * and their grid must simply read `pending: false`.
 */
type FilterNavValue = {
  /** True while a filter navigation is in flight OR text input is mid-debounce. */
  pending: boolean;
  /** Apply filters: soft navigate (replace) to `href`, wrapped in a transition. */
  navigate: (href: string) => void;
  /** Mark pending immediately (debounced text inputs, before the nav fires). */
  setSoftPending: () => void;
};

const NOOP_VALUE: FilterNavValue = {
  pending: false,
  navigate: () => {},
  setSoftPending: () => {},
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

  const pending = isNavigating || soft;

  const value = useMemo<FilterNavValue>(
    () => ({ pending, navigate, setSoftPending }),
    [pending, navigate, setSoftPending],
  );

  return <FilterNavContext.Provider value={value}>{children}</FilterNavContext.Provider>;
}
