"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

/**
 * A car-page panel that folds behind its title and count on a phone (owner point 12, decided 18.11.2026 as the boards
 * draw it: `cd-korea*`, `.cd-exp--ph`). „Фабрични пакети", „История на автомобила" and „Технически преглед" run to
 * 30–50 chips or entries on a phone, so there they start folded and the title is the toggle. From 640 px the panel is
 * exactly what it was: the plain heading and the content (`.cd-fold__b` is `display: contents` there).
 *
 * Folded content stays in the page (hidden on a phone only), so its text is still there for search. Following the
 * section's anchor — the VIN card's Korean line links to `#encar-history` — unfolds it.
 */
export function FoldOnPhone({
  id,
  title,
  count,
  className = "",
  children,
}: {
  id?: string;
  title: string;
  /** Shown beside the title, „(33)". */
  count?: number;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  // The VIN card's link to this section opens it (a folded section would otherwise show only its title).
  useEffect(() => {
    if (!id) return;
    const onHash = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [id]);

  const counter = count !== undefined ? <small className="text-sm font-bold text-tx3">({count})</small> : null;

  return (
    <section id={id} className={`sa-pnl cd-fold ${open ? "is-open" : ""} ${className}`}>
      {/* The phone's toggle (hidden from 640 px). */}
      <h2 className="cd-exp__h cd-fold__ph">
        <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((v) => !v)}>
          <span>
            {title}
            {count !== undefined ? <small>({count})</small> : null}
          </span>
          <ChevronDownIcon className="transition-transform duration-200 ease-out motion-reduce:transition-none" />
        </button>
      </h2>
      <div id={bodyId} className="cd-fold__b">
        {/* The panel's own heading, as before (hidden on a phone, where the toggle above stands in for it). */}
        <div className="sa-pnl__h">
          <h2 className="sa-pnl__t">
            {title}
            {counter ? <> {counter}</> : null}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}
