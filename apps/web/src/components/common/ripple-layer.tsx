"use client";

import { useEffect } from "react";

/**
 * The click ripple on every clickable control, the site and the admin alike. `main` drew it inside every `Button` and
 * `LinkButton`, the brand tiles and the contact cards (`ripple.tsx`); the rebuild's kit buttons left it out, and it
 * was gone everywhere (the owner, 19.11.2026). One delegated listener for the page instead of one per control, so the
 * kit's plain `<button>`s (segments, tabs, chips, options, thumbnails) have it too:
 *
 * - a primary press spawns a circle from the press point inside the control, and Enter or Space on a focused control
 *   one from its centre, the same circle, colour and 1 s animation as `main` (`animate-ripple-effect`, globals.css);
 * - it is clipped to the control's shape: its border radius (inherited), and a chamfered button's clip-path, which
 *   clips its children;
 * - light on the dark surfaces, dark on a light one: by the control's own background, or, for a see-through control
 *   (ghost buttons, tabs, segments), by the theme of the ground it sits on (the page's, or a night island's);
 * - nothing under reduced motion.
 *
 * The control is not restyled beyond `position: relative` when it was static, which moves nothing, so nothing it holds
 * is clipped (the old component made its host `overflow: hidden`). Opt an element in with `data-ripple`, out with
 * `data-no-ripple`.
 */
const CONTROLS = [
  "button:not(:disabled)",
  "summary",
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]',
  '[role="option"]',
  '[role="menuitem"]',
  "a.sa-btn",
  "a.sa-ib",
  "a.sa-chip",
  ".sa-seg>a",
  ".sa-tabs>a",
  ".sa-hdr__nav>a",
  ".sa-drawer__nav a",
  ".sa-bnav>a",
  ".sa-menu a",
  "[data-ripple]",
].join(",");

/** The control a press or key belongs to, if it ripples. */
function hostFor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const host = target.closest<HTMLElement>(CONTROLS);
  if (!host || host.closest("[data-no-ripple]")) return null;
  // A control that still renders the React <Ripple> (the legacy look) draws its own.
  if (host.querySelector(":scope > [data-ripple-react]")) return null;
  return host;
}

/**
 * Whether the control shows a light ground. Its own background when it has a visible one (a computed `rgb()`, as every
 * solid token gives); a see-through control takes the theme of the nearest `data-theme` around it: the page's light or
 * night (none = night), or a night island inside a light page (styles/tokens.css).
 */
function onLight(host: HTMLElement, background: string): boolean {
  const m = background.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (a >= 0.5) return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
  }
  return host.closest("[data-theme]")?.getAttribute("data-theme") === "light";
}

function spawn(host: HTMLElement, clientX: number | null, clientY: number | null) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = host.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const style = getComputedStyle(host);
  if (style.position === "static") host.style.position = "relative";

  const size = Math.max(rect.width, rect.height);
  const x = (clientX === null ? rect.width / 2 : clientX - rect.left) - size / 2;
  const y = (clientY === null ? rect.height / 2 : clientY - rect.top) - size / 2;

  const clip = document.createElement("span");
  clip.setAttribute("aria-hidden", "true");
  Object.assign(clip.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    borderRadius: "inherit",
    pointerEvents: "none",
  });
  const dot = document.createElement("span");
  dot.className = "animate-ripple-effect";
  Object.assign(dot.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    pointerEvents: "none",
    backgroundColor: onLight(host, style.backgroundColor) ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)",
  });
  clip.appendChild(dot);
  host.appendChild(clip);

  const done = () => clip.remove();
  dot.addEventListener("animationend", done, { once: true });
  // A control hidden mid-animation never fires animationend.
  window.setTimeout(done, 1500);
}

export function RippleLayer() {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // The primary button of the primary pointer only: a right click or a second finger adds no circle.
      if (e.button !== 0 || !e.isPrimary) return;
      const host = hostFor(e.target);
      if (host) spawn(host, e.clientX, e.clientY);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
      const host = hostFor(e.target);
      // The focused control itself: Space typed in a field inside a control is not a press.
      if (host && host === e.target) spawn(host, null, null);
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  return null;
}
