"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Forces the window to the top after a forward (link / `router.push`) navigation
 * that changes the **pathname**. Mounted once in the root layout.
 *
 * Why a one-shot `scrollTo(0, 0)` is not enough: on streamed routes like
 * `/vsichki-avtomobili`, Next's router runs its own scroll *restoration*
 * (`scrollWithAdjustments`) which re-applies a remembered offset **repeatedly as
 * the content streams in** — it fires several times over ~1s and clobbers a
 * single scroll-to-top. (Setting `history.scrollRestoration = "manual"` doesn't
 * stop it; it's Next's logic, not the browser's.) So we *win the race* by pinning
 * the top on every animation frame for a short, bounded window, then stop once
 * the position is stable. Verified against the streamed catalog page.
 *
 * Gating:
 *  - Keyed on `usePathname()` (NOT search params), so in-page filter updates —
 *    which the catalog filter bar does via `router.replace(?…, { scroll:false })`,
 *    same pathname — are ignored and never jump.
 *  - Skips the navigation right after a `popstate` so the browser's back/forward
 *    scroll restoration is preserved.
 *  - Aborts the moment the user actually scrolls (wheel/touch/key), so we never
 *    fight a deliberate scroll during the enforcement window.
 *
 * Under `cacheComponents`, `usePathname` needs a `<Suspense>` boundary on routes
 * with a dynamic param — it's wrapped in one in the root layout.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const isFirst = useRef(true);
  const fromPopState = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      fromPopState.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    // Don't scroll on initial load (the SSR landing position is correct).
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    // Leave back/forward to the browser's native scroll restoration.
    if (fromPopState.current) {
      fromPopState.current = false;
      return;
    }

    let rafId = 0;
    let aborted = false;
    const start = performance.now();
    let stableFrames = 0;

    // The user taking control cancels enforcement immediately.
    const onUserScroll = () => {
      aborted = true;
    };
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("wheel", onUserScroll, opts);
    window.addEventListener("touchmove", onUserScroll, opts);
    window.addEventListener("keydown", onUserScroll);

    const tick = () => {
      if (aborted) return;
      const y = window.scrollY || document.documentElement.scrollTop;
      if (y > 1) {
        window.scrollTo(0, 0);
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }
      // Stop once the top has held for a few frames or the window elapses
      // (Next's restoration loop settles well within ~1s).
      if (performance.now() - start < 1500 && stableFrames < 5) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      aborted = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", onUserScroll, opts);
      window.removeEventListener("touchmove", onUserScroll, opts);
      window.removeEventListener("keydown", onUserScroll);
    };
  }, [pathname]);

  return null;
}
