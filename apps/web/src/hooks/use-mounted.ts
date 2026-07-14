import { useSyncExternalStore } from "react";

// A no-op store: the value never changes after hydration, so `subscribe` never
// needs to fire. Module-scoped so its identity is stable across renders.
const subscribe = () => () => {};

/**
 * Returns `false` during SSR / the static-shell prerender and `true` once running
 * on the client (post-hydration). Uses `useSyncExternalStore` rather than a
 * `useState`+`useEffect` toggle so it doesn't trip `react-hooks/set-state-in-effect`
 * (and avoids the extra cascading render that pattern causes).
 *
 * Use it to gate client-only runtime behaviour that must NOT run during Next's
 * `cacheComponents` prerender — e.g. Swiper `autoplay`, which calls `new Date()`
 * on init and would otherwise throw "used `new Date()` inside a Client Component
 * without a Suspense boundary".
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
