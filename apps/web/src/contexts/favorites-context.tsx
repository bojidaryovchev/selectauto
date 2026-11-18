"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getMyFavoriteIds } from "@/mutations/favorites";

/**
 * Client-side favourites state for the current user.
 *
 * Why a context and not per-card server reads: the catalog grid is VIRTUALIZED —
 * cards mount/unmount as they scroll, so a card can't fetch its own favourite
 * state server-side. Instead this provider holds the user's full favourite-id set
 * and every <FavoriteButton> reads its filled/empty state synchronously by
 * `carId`, writing back optimistically on toggle so all mounted copies of a card
 * (grid + detail + /lyubimi) stay in sync.
 *
 * Why it self-seeds on the client: seeding server-side would mean calling
 * `auth()` in the root layout, which (reads request headers) forces the static
 * shell dynamic under cacheComponents. Instead we fetch the ids on mount via the
 * `getMyFavoriteIds` action once the Auth.js session reports the user is signed
 * in. Signed-out users keep an empty set (hearts render empty; a click prompts
 * sign-in).
 */
type FavoritesContextValue = {
  isFavorite: (carId: number) => boolean;
  setFavorite: (carId: number, favorited: boolean) => void;
  // False until the favourite-id set has been resolved for the current user
  // (fetched when signed in, or resolved empty when signed out). Consumers that
  // HIDE content based on membership must wait for this so they don't act on the
  // pre-seed empty set — e.g. the /lyubimi grid keeps showing its server-rendered
  // cards until `initialized`, then filters out any un-favourited since.
  initialized: boolean;
  /** The last load of the saved cars failed (no connection, a server error); it is retried, waiting longer each time. */
  failed: boolean;
  /** Load the saved cars again now (a heart tapped while `failed`). */
  retry: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within <FavoritesProvider>");
  }
  return ctx;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status, data } = useSession();
  const isSignedIn = status === "authenticated";
  const userId = data?.user?.id;
  const [ids, setIds] = useState<Set<number>>(() => new Set());
  const [initialized, setInitialized] = useState(false);
  // A failed load used to leave `initialized` false for the whole visit, and every heart waits for it: they all stopped
  // responding (production review, 18.11.2026). It is retried instead; marking the list loaded would be worse, since
  // a tap on a saved car whose heart reads empty removes it (toggleFavorite flips the stored state).
  const [failures, setFailures] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const failed = failures > 0;

  // Seed (and re-seed on user change) from the server once the session resolves.
  // Keyed on `userId` so switching accounts refetches. We only ever call setState
  // from the async resolution (not synchronously in the effect body) — signed-out
  // resolves to an empty set via the same path, so a sign-out clears the hearts
  // without a synchronous setState (which the lint rule forbids).
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const load = isSignedIn ? getMyFavoriteIds() : Promise.resolve<number[]>([]);
    load
      .then((list) => {
        if (!cancelled) {
          setIds(new Set(list));
          setInitialized(true);
          setFailures(0);
        }
      })
      .catch(() => {
        if (!cancelled) setFailures((n) => n + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [status, isSignedIn, userId, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // A failed load is tried again after 5 s, then 10, 20 and 40, then every minute — not every few seconds from each
  // open tab while the server is down — and at once when the connection comes back, or when a heart is tapped
  // (FavoriteButton calls `retry`).
  useEffect(() => {
    if (failures === 0) return;
    const t = setTimeout(retry, Math.min(5000 * 2 ** (failures - 1), 60_000));
    window.addEventListener("online", retry);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", retry);
    };
  }, [failures, retry]);

  const isFavorite = useCallback((carId: number) => ids.has(carId), [ids]);

  const setFavorite = useCallback((carId: number, favorited: boolean) => {
    setIds((prev) => {
      // Only allocate a new Set when membership actually changes, so cards that
      // don't involve `carId` don't re-render on every toggle.
      if (favorited === prev.has(carId)) return prev;
      const next = new Set(prev);
      if (favorited) next.add(carId);
      else next.delete(carId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isFavorite, setFavorite, initialized, failed, retry }),
    [isFavorite, setFavorite, initialized, failed, retry],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
