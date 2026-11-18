"use client";

import { useEffect, useState } from "react";
import { ArrowDownIcon } from "@/components/icons";

/**
 * The Carfax page's bar on phones and tablets (board `in-carfax`, below 1024 px): „Изпратете запитване" jumps to the
 * form. It hides while the hero's actions or the form are on screen (README, bars) and starts hidden until it knows;
 * hidden, it leaves the tab order. It follows the bottom tabs (`<html data-bars-hidden>`) and, while it shows, lifts
 * back-to-top and the notifications (globals.css, `--page-bar`: 65 px with its 44 px button).
 */
export function CarfaxBar({ formId, actionsId }: { formId: string; actionsId: string }) {
  const [inView, setInView] = useState<Set<string> | null>(null);

  useEffect(() => {
    const targets = [formId, actionsId]
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
  }, [formId, actionsId]);

  const shown = inView !== null && inView.size === 0;

  return (
    <div
      inert={!shown}
      className={`sa-bar in-bar pb-[calc(10px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none ${
        shown
          ? "is-on [:root[data-bars-hidden]_&]:translate-y-(--bottom-nav)"
          : "translate-y-[calc(100%+var(--bottom-nav))]"
      }`}
    >
      <a href={`#${formId}`} className="sa-btn sa-btn--pri sa-btn--md sa-btn--block">
        Изпратете запитване
        <ArrowDownIcon />
      </a>
    </div>
  );
}
