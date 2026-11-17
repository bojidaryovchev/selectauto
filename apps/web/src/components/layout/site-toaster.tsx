"use client";

import toast, { resolveValue, useToaster } from "react-hot-toast";
import { IconButton } from "@/components/common";
import { AlertIcon, CircleCheckIcon, CloseIcon } from "@/components/icons";

/**
 * The app's notifications, drawn with react-hot-toast's headless `useToaster` (boards `ac-float`, `ac-float-desk`;
 * README, interaction rules). Every `toast()` call in the app lands here.
 *
 * - Bottom right on desktop, left of the back-to-top button while it shows; above the bottom tabs on phones. The
 *   offsets are in globals.css (`.sa-toasts`).
 * - Each closes itself after 2,2 s, or with ✕.
 * - All of them pause while hovered or while focus is inside, so a keyboard user can reach ✕.
 * - Success and error carry their icon; the newest sits nearest the edge.
 */
export function SiteToaster() {
  const { toasts, handlers } = useToaster({ duration: 2200, removeDelay: 200 });
  const { startPause, endPause } = handlers;

  return (
    <div
      className="sa-toasts"
      onMouseEnter={startPause}
      onMouseLeave={endPause}
      onFocus={startPause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) endPause();
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          {...t.ariaProps}
          className={`sa-toast pointer-events-auto transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-opacity ${
            t.type === "success" ? "sa-toast--pos" : t.type === "error" ? "sa-toast--neg" : ""
          } ${t.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        >
          {t.type === "success" ? <CircleCheckIcon /> : null}
          {t.type === "error" ? <AlertIcon /> : null}
          {t.type === "loading" ? <span className="sa-spin" aria-hidden="true" /> : null}
          <span>{resolveValue(t.message, t)}</span>
          <IconButton label="Затворете" variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>
            <CloseIcon />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
