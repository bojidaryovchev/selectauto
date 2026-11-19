"use client";

import { currentTheme, setTheme, THEME_KEY, type Theme } from "@/lib/theme";
import { useSyncExternalStore } from "react";

/**
 * The theme switch (owner, 19.11.2026): night ↔ light, in the header, the phone's top bar and the admin's sidebar and
 * top bar. A small sky: night is a moon with craters on a deep-navy track with twinkling stars; day is a sun with
 * rotating rays on a blue sky with a drifting cloud. The knob slides across with a slight overshoot, and the page
 * changes with a circle that grows out of the switch to cover the screen (the View Transitions API; browsers without it
 * switch at once). Under reduced motion everything switches at once.
 *
 * Its look comes from the page's `data-theme` through CSS (kit.css, `.sa-theme`), not from React state, so it is right
 * from the first paint, before hydration. It is a `switch`: on = the light theme.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // A choice made in another tab of the site applies here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY && (e.newValue === "light" || e.newValue === "dark")) setTheme(e.newValue);
  };
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/** The page changes through a circle that grows from the switch's centre until it covers the screen. */
function switchFrom(button: HTMLElement, next: Theme) {
  const doc = document as ViewTransitionDocument;
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(next);
    return;
  }
  const r = button.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = doc.startViewTransition(() => setTheme(next));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      // The transition was skipped (another one started): the theme is applied all the same.
    });
}

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "dark" as Theme);
  const light = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Светла тема"
      title={light ? "Тъмна тема" : "Светла тема"}
      onClick={(e) => switchFrom(e.currentTarget, light ? "dark" : "light")}
      // Its own feedback is the knob's travel and the page's circle; no ripple on top.
      data-no-ripple=""
      className={`sa-theme ${className}`}
    >
      <span className="sa-theme__track" aria-hidden="true">
        <span className="sa-theme__sky sa-theme__sky--night" />
        <span className="sa-theme__sky sa-theme__sky--day" />
        <span className="sa-theme__stars">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="sa-theme__cloud" />
        <span className="sa-theme__knob">
          <span className="sa-theme__rays" />
          <span className="sa-theme__sun" />
          <span className="sa-theme__moon">
            <i />
            <i />
            <i />
          </span>
        </span>
      </span>
    </button>
  );
}
