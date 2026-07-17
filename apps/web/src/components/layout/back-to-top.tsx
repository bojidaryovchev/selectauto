"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/common";
import { ArrowUpIcon } from "@/components/icons";

/**
 * Floating "обратно нагоре" (back-to-top) button, mounted once in the root
 * layout. Reveals once the page has been scrolled past {@link REVEAL_AFTER_PX}
 * and scrolls the window smoothly back to the top on click.
 *
 * Positioning: fixed to the bottom-right. On mobile it's lifted above the fixed
 * `<MobileBottomNav>` (≈62px + the iOS home-indicator safe area) so the two
 * never overlap. Its `z-10030` sits *below* the drawer overlay (`z-10040`), so
 * an open mobile menu covers it rather than letting it float on top.
 *
 * Motion: scale + fade + slide-up on reveal (compositor-only transform/opacity).
 * The scroll itself uses `behavior: "smooth"`, downgraded to an instant jump
 * when the user prefers reduced motion.
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
      // `pointer-events-none` on the wrapper so the empty gutter never eats
      // clicks; the button re-enables them for itself only while visible.
      className="pointer-events-none fixed bottom-6 right-4 z-10030 lg:right-6 max-lg:bottom-[calc(62px+env(safe-area-inset-bottom)+1rem)]"
    >
      <Button
        onClick={scrollToTop}
        rippleTheme="light"
        aria-label="Обратно нагоре"
        // Slide-up + fade + scale on reveal; hover lifts it a touch and deepens
        // the shadow. `will-change-transform` keeps the transition on the
        // compositor. Reduced-motion users get the same end states, just no tween.
        className={`grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_12px_30px_rgba(216,111,22,0.45)] ring-1 ring-black/5 transition-all duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_16px_38px_rgba(216,111,22,0.55)] lg:size-13 ${
          visible
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-90 opacity-0"
        }`}
      >
        <ArrowUpIcon className="size-6" />
      </Button>
    </div>
  );
}
