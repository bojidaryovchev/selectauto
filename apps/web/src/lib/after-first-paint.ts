import { useSyncExternalStore } from "react";

/**
 * Runs `callback` once the page's first contentful paint is on screen and the main
 * thread is next idle. Returns a cancel function.
 *
 * For work that is NOT needed to show the page — the hero's WebGL scene, warming
 * the inquiry modal's chunk — so that it never competes with that paint or with
 * hydration. Idle time alone is not enough of a gate: the main thread is routinely
 * idle for a moment BEFORE the first paint (waiting on the compositor), and an idle
 * callback that fires there starts a download ahead of the paint it was meant to
 * follow.
 *
 * The 3s timeout covers browsers without paint timing (Safari < 14.1) and tabs
 * opened in the background, which do not paint until shown. requestIdleCallback
 * only reached Safari in 17.4, hence the setTimeout fallback.
 */
export function afterFirstPaint(callback: () => void): () => void {
  let done = false;
  let idleId = 0;
  let timeoutId = 0;
  let observer: PerformanceObserver | null = null;

  const schedule = () => {
    if (done) return;
    done = true;
    observer?.disconnect();
    window.clearTimeout(timeoutId);
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(callback, { timeout: 1000 });
    } else {
      timeoutId = window.setTimeout(callback, 200);
    }
  };

  timeoutId = window.setTimeout(schedule, 3000);
  try {
    observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName("first-contentful-paint").length > 0) schedule();
    });
    // `buffered` replays a paint that already happened — the normal case, since the
    // HTML paints before hydration runs any effect — and every client-side navigation.
    observer.observe({ type: "paint", buffered: true });
  } catch {
    schedule();
  }

  return () => {
    done = true;
    observer?.disconnect();
    window.clearTimeout(timeoutId);
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
  };
}

let painted = false;
let watching = false;
const paintListeners = new Set<() => void>();

function subscribeToPaint(onPaint: () => void): () => void {
  paintListeners.add(onPaint);
  if (!watching) {
    watching = true;
    afterFirstPaint(() => {
      painted = true;
      for (const listener of paintListeners) listener();
    });
  }
  return () => {
    paintListeners.delete(onPaint);
  };
}

/**
 * `false` until `afterFirstPaint` fires for the page the visit started on, then
 * `true` for the rest of the visit — so after a client-side navigation it is
 * `true` straight away. `false` on the server.
 *
 * The site header and LinkButton (so also the bottom nav, built from them) use
 * it to hold route prefetching until the page has painted. Next prefetches
 * every link in view as soon as the browser first reports it visible — at the
 * first frame — and each prefetch pulls the linked route's payload plus the
 * code behind it (the form pages alone bring zod and react-hook-form).
 * PageSpeed's mobile runs often report that first paint ~2.4s in, and count
 * every request started before it against the paint and LCP: ~200KB of
 * prefetch traffic did. Measured in a local reproduction, holding prefetches
 * (and the carousel photos) until after the paint took LCP from 5.0-6.0s to
 * 3.7-3.8s. Navigation still prefetches, a moment later.
 */
export function useHasPainted(): boolean {
  return useSyncExternalStore(subscribeToPaint, () => painted, () => false);
}
