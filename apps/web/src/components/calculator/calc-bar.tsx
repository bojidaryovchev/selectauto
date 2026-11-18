"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * A calculator's result bar on a phone (boards `im-leasing-p`, `im-budget-p`, `im-fin-flow`): fixed above the bottom
 * tabs, it keeps the answer — and on the leasing calculator „Кандидатствайте" — in view while the inputs scroll.
 * It hides while the summary it repeats is on screen (README, bars) and leaves the tab order then; it slides to the
 * screen's edge when the tabs hide (`<html data-bars-hidden>`, SiteHeader). While it shows, the back-to-top button and
 * the notifications move above it (globals.css, `--page-bar`); the page reserves its height after the footer.
 */
export function CalcBar({ watchId, children }: { watchId: string; children: ReactNode }) {
  const [targetInView, setTargetInView] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetInView(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  const shown = !targetInView;

  return (
    <div
      inert={!shown}
      className={`sa-bar im-bar sa-only-ph fixed inset-x-0 bottom-(--bottom-nav) z-45 pb-[calc(10px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none ${
        shown
          ? "is-on [:root[data-bars-hidden]_&]:translate-y-(--bottom-nav)"
          : "translate-y-[calc(100%+var(--bottom-nav))]"
      }`}
    >
      {children}
    </div>
  );
}
