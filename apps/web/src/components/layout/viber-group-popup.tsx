"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buttonClasses, IconButton } from "@/components/common";
import { CloseIcon, ViberGlyphIcon } from "@/components/icons";
import { SOCIALS } from "@/constants";

/**
 * Floating „Влезте във Viber групата" call to action, mounted once in the root
 * layout (through PublicWidgets, which leaves it out of /admin): a pill at the top
 * on desktop, a card across the top on phones and tablets (boards `ac-float`,
 * `ac-float-desk`).
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
      // Fixed near the TOP. The header and the top bar hide on scroll-down — which is exactly when this popup
      // reveals — so they never collide. `pointer-events-none` on the wrapper and `pointer-events-auto` on the popup
      // let presses pass through the empty gutters.
      className="pointer-events-none fixed inset-x-3 top-3 z-10060 flex justify-center lg:inset-x-4 lg:top-4"
      aria-hidden={!visible}
      // `aria-hidden` hides it from assistive tech but leaves the link and the close button in the tab order —
      // keyboard focus could land on a control nobody can see. `inert` takes the whole subtree out while hidden.
      inert={!visible}
    >
      <div
        // Slides down and fades in on reveal; slides back up and fades out on hide. Reduced motion keeps the fade.
        className={`pointer-events-auto w-full transition-[translate,opacity] duration-300 ease-out will-change-transform motion-reduce:transition-opacity lg:w-auto ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-6 opacity-0"
        }`}
        role="dialog"
        aria-label="Влезте във Viber групата"
      >
        {/* Desktop: a pill at the top centre (board `ac-float-desk`). */}
        <div className="sa-viberpop max-lg:hidden">
          <span className="sa-viberpop__ic">
            <ViberGlyphIcon />
          </span>
          <div className="sa-viberpop__tx">
            <b>Влезте във Viber групата</b>
            <span>Получавайте първи най-добрите оферти</span>
            <em>6,500+ ентусиасти вече се присъединиха</em>
          </div>
          <a
            href={VIBER_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "vb", size: "md" })}
          >
            Влезте
          </a>
          <IconButton label="Затворете" variant="ghost" onClick={close}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Phones and tablets: a card across the top with a full-width button (board `ac-float`, state 2). */}
        <div className="flex flex-col gap-3 rounded-[20px] border border-hair2 bg-s2 p-3.5 shadow-pop lg:hidden">
          <div className="flex items-start gap-3">
            <span className="grid size-11 flex-none place-items-center rounded-full bg-viber text-white">
              <ViberGlyphIcon className="size-5.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <b className="block text-base leading-[1.3]">Влезте във Viber групата</b>
              <span className="mt-0.5 block text-sm leading-[1.4] text-tx2">Получавайте първи най-добрите оферти</span>
              <em className="mt-0.5 block text-sm font-bold not-italic leading-[1.4] text-vibertx">
                6,500+ ентусиасти вече се присъединиха
              </em>
            </div>
            <IconButton label="Затворете" variant="ghost" onClick={close} className="-mr-1.5 -mt-1.5">
              <CloseIcon />
            </IconButton>
          </div>
          <a
            href={VIBER_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonClasses({ variant: "vb", size: "md", block: true })} rounded-full`}
          >
            Влезте
          </a>
        </div>
      </div>
    </div>
  );
}
