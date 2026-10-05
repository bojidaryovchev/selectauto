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
