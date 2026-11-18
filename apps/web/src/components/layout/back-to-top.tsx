"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/common";
import { ArrowUpIcon } from "@/components/icons";

/**
 * Floating "обратно нагоре" (back-to-top) button, mounted once in the root
 * layout (through PublicWidgets, which leaves it out of /admin). Reveals once
 * the page has been scrolled past {@link REVEAL_AFTER_PX}
 * and scrolls the window smoothly back to the top on click.
 *
 * Positioning: fixed to the bottom-right (boards `ac-float`, `ac-float-desk`). On
 * phones and tablets it's lifted above the bottom tab bar and the iOS
 * home-indicator safe area, so the two never overlap, and above a page's own bottom bar while one shows
 * (`--page-bar`, globals.css; the car page's action bar). Its `z-10030` sits *below*
 * the drawer overlay (`z-10040`), so an open menu covers it.
 *
 * Motion: scale + fade + slide-up on reveal. The scroll itself uses
 * `behavior: "smooth"`, downgraded to an instant jump when the user prefers
 * reduced motion.
 */

/** Pixels scrolled before the button appears. Roughly one viewport on mobile. */
const REVEAL_AFTER_PX = 600;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Seed from the current position (e.g. the catalog's `?after=` deep restore
    // can land us far down without ever firing a scroll event).
    const update = () => setVisible(window.scrollY > REVEAL_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const scrollToTop = () => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  };

  return (
    <div
      // `pointer-events-none` on the wrapper so the empty gutter never eats presses; the button re-enables them for
      // itself only while visible. On phones and tablets it sits above the bottom tab bar.
      className="pointer-events-none fixed bottom-[calc(var(--bottom-nav)+var(--page-bar,0px)+16px+env(safe-area-inset-bottom))] right-4 z-10030 lg:bottom-6 lg:right-6"
    >
      <IconButton
        label="Обратно нагоре"
        onClick={scrollToTop}
        // Out of the tab order and the accessibility tree while it's invisible.
        tabIndex={visible ? undefined : -1}
        aria-hidden={visible ? undefined : true}
        // `sa-totop`, plus `is-on` while shown: the notifications move left of it (globals.css).
        className={`sa-totop transition-[translate,scale,opacity] duration-300 ease-out will-change-transform motion-reduce:transition-opacity ${
          visible ? "is-on pointer-events-auto translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-90 opacity-0"
        }`}
      >
        <ArrowUpIcon />
      </IconButton>
    </div>
  );
}
