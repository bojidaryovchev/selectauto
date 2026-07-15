"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, LinkButton } from "@/components/common";
import { CloseIcon, ViberGlyphIcon } from "@/components/icons";
import { SOCIALS } from "@/constants";

/**
 * Floating "Влез във Viber групата" CTA pill, mounted once in the root layout.
 *
 * Behaviour (per product spec):
 *  - Reveals while the user scrolls DOWN (past a small threshold), hides while
 *    scrolling UP — so it stays out of the way when the user heads back up and
 *    re-appears as they continue reading down.
 *  - The close (✕) button dismisses it for the rest of the browsing session: we
 *    persist a flag in `sessionStorage` (NOT localStorage — it should re-offer on
 *    the next visit), and never show it again until the tab is closed.
 *
 * The Viber group invite URL is the single source in `SOCIALS` (constants), so
 * the footer/about links and this popup can't drift apart.
 */

/** Pixels scrolled before the popup is allowed to appear at all. */
const REVEAL_AFTER_PX = 320;
/** Min delta between scroll samples to count as a deliberate up/down move (kills jitter). */
const DIRECTION_THRESHOLD_PX = 6;
/** sessionStorage key — gone for the session once the user closes it. */
const DISMISSED_KEY = "sa-viber-popup-dismissed";

const VIBER_HREF = SOCIALS.find((s) => s.label === "Viber")?.href ?? "#";

/**
 * The per-session dismissal flag, modelled as an external store so we can read it
 * via `useSyncExternalStore` — the idiomatic, lint-clean way to read browser
 * storage in a client component without a synchronous setState-in-effect. The
 * server snapshot is `true` (render nothing during SSR); after hydration React
 * swaps in the client snapshot (the real sessionStorage value) without a mismatch
 * warning. `close()` writes the flag and notifies subscribers.
 */
const DISMISS_EVENT = "sa:viber-popup-dismiss";

function subscribeDismissed(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

function getDismissedSnapshot(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Private-mode / disabled storage — treat as not dismissed so it still shows.
    return false;
  }
}

/** SSR: always "dismissed" so the server renders nothing (no scroll context yet). */
function getDismissedServerSnapshot(): boolean {
  return true;
}

export function ViberGroupPopup() {
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot,
  );
  const [visible, setVisible] = useState(false);
  const lastY = useRef(0);
  // Consecutive down-scroll events — the reveal requires 2+ (see onScroll).
  const downEvents = useRef(0);

  // Scroll-direction toggle. Skipped entirely once dismissed (no listener cost).
  useEffect(() => {
    if (dismissed) return;

    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;

      // Teleport-sized jumps are programmatic scrolls (e.g. the catalog's
      // `?after=` restore jumping deep into the feed on load), not a user
      // reading direction — don't let them reveal/hide the popup. Same guard
      // as the site header's hide-on-scroll logic.
      if (Math.abs(delta) > 1000) {
        lastY.current = y;
        downEvents.current = 0;
        return;
      }

      // Ignore tiny scroll jitter so the popup doesn't flicker.
      if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) return;

      if (delta > 0) {
        // Scrolling down — show, but only after the down-motion persists across
        // 2+ scroll events (real scrolling always does; the catalog
        // virtualizer's one-off row-measurement corrections are single events
        // and must not reveal the popup mid-pause) and past the threshold.
        downEvents.current += 1;
        if (downEvents.current >= 2 && y > REVEAL_AFTER_PX) setVisible(true);
      } else {
        // Scrolling up — hide.
        downEvents.current = 0;
        setVisible(false);
      }
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  const close = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private-mode / disabled storage — ignore; the dispatch below still hides it.
    }
    // Notify the external store so `dismissed` re-reads → unmounts the popup.
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  // Once dismissed for the session we render nothing at all.
  if (dismissed) return null;

  return (
    <div
      // Fixed, centred near the TOP. The sticky header auto-hides on scroll-down —
      // which is exactly when this popup reveals — so the two never collide.
      // `pointer-events-none` on the wrapper + `pointer-events-auto` on the pill
      // lets clicks pass through the empty gutters.
      className="pointer-events-none fixed inset-x-0 top-4 z-10060 flex justify-center px-3 max-md:top-3"
      aria-hidden={!visible}
    >
      <div
        // Slide DOWN from above + fade in on reveal; slide back up + fade out (and
        // disable pointer events) on hide. `will-change-transform` keeps the
        // transition on the compositor. Respects reduced-motion via the duration
        // utilities only.
        className={`pointer-events-auto flex w-[min(620px,100%)] items-center gap-4 rounded-full bg-white py-3 pl-3 pr-3.5 shadow-[0_24px_60px_rgba(15,12,41,0.28)] ring-1 ring-black/5 transition-all duration-300 ease-out will-change-transform max-md:gap-3 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-6 opacity-0"
        }`}
        role="dialog"
        aria-label="Влез във Viber групата"
      >
        {/* Purple Viber badge */}
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#7360f2] text-white shadow-[0_8px_20px_rgba(115,96,242,0.45)] max-md:size-12">
          <ViberGlyphIcon className="size-7 max-md:size-6" />
        </span>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold leading-tight text-ink max-md:text-[15px]">
            Влез във Viber групата
          </p>
          <p className="truncate text-[15px] leading-snug text-muted max-md:text-[13px]">
            Получавайте първи най-добрите оферти
          </p>
          <p className="truncate text-[15px] font-bold leading-snug text-[#2f80ff] max-md:text-[13px]">
            6,500+ ентусиасти вече се присъединиха
          </p>
        </div>

        {/* CTA — external link to the Viber group; light ripple on the purple surface. */}
        <LinkButton
          href={VIBER_HREF}
          target="_blank"
          rel="noopener noreferrer"
          rippleTheme="light"
          className="shrink-0 rounded-full bg-[#7360f2] px-7 py-3 text-[16px] font-extrabold text-white transition-colors hover:bg-[#5f4ce6] max-md:px-5 max-md:py-2.5 max-md:text-[14px]"
        >
          Влез
        </LinkButton>

        {/* Close — dismisses for the session. Dark ripple on the white surface.
            Uses the same {@link CloseIcon} as the header's drawer-close button. */}
        <Button
          onClick={close}
          aria-label="Затвори"
          rippleTheme="dark"
          className="grid size-9 shrink-0 place-items-center rounded-full leading-none text-muted/70 transition-colors hover:bg-black/5 hover:text-ink max-md:size-8"
        >
          <CloseIcon className="size-5 max-md:size-4.5" />
        </Button>
      </div>
    </div>
  );
}
