"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * A bar on a phone (boards `im-leasing-p`, `im-budget-p`, `im-fin-flow`, `im-hub-*-p`): fixed above the bottom tabs,
 * it keeps a calculator's answer — or an import hub's two actions — in reach while the page scrolls. It hides while
 * what it repeats is on screen (README, bars): any of the elements `watchIds` names. Hidden, it leaves the tab order;
 * it slides to the screen's edge when the tabs hide (`<html data-bars-hidden>`, SiteHeader). While it shows, the
 * back-to-top button and the notifications move above it (globals.css, `--page-bar`); the page reserves its height
 * after the footer. A bar with a 48 px button is 69 px high; `text` marks one that holds only text (the budget's
 * range, its block 40 px high), 61 px.
 */
export function CalcBar({
  watchIds,
  text = false,
  children,
}: {
  watchIds: string[];
  text?: boolean;
  children: ReactNode;
}) {
  // `null` until the observer first reports: the bar starts hidden, so it never shows at load only to slide away
  // because what it repeats is already on screen (an import hub's hero actions on a phone).
  const [inView, setInView] = useState<Set<string> | null>(null);
  const key = watchIds.join(" ");

  useEffect(() => {
    const targets = key
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) {
      const frame = requestAnimationFrame(() => setInView(new Set()));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver((entries) => {
      setInView((prev) => {
        const next = new Set(prev ?? []);
        for (const entry of entries) {
          if (entry.isIntersecting) next.add(entry.target.id);
          else next.delete(entry.target.id);
        }
        return next;
      });
    });
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [key]);

  const shown = inView !== null && inView.size === 0;

  return (
    <div
      inert={!shown}
      className={`sa-bar im-bar ${text ? "im-bar--text" : ""} sa-only-ph fixed inset-x-0 bottom-(--bottom-nav) z-45 pb-[calc(10px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none ${
        shown
          ? "is-on [:root[data-bars-hidden]_&]:translate-y-(--bottom-nav)"
          : "translate-y-[calc(100%+var(--bottom-nav))]"
      }`}
    >
      {children}
    </div>
  );
}
