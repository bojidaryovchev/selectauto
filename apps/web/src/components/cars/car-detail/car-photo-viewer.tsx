"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/common";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";

/** Zoom of a double tap or double click inside the viewer. */
const ZOOM = 2.5;
/** The furthest a pinch zooms in. */
const MAX_ZOOM = 4;
/** Finger travel (px) that makes a swipe: anything shorter is a tap. */
const SWIPE = 40;
/** Two taps within this many ms are a double tap. */
const DOUBLE_TAP_MS = 300;

/**
 * The full-screen photo viewer (owner decision 22; boards `cd-f-viewer`, `cd-f-viewer-d`): the car's title, the
 * counter and ✕ „Затворете" on top, the photo fitted to the screen with „Предишна снимка" / „Следваща снимка", the
 * thumbnails underneath (from 640 px; a phone shows the counter instead).
 *
 * - Keys: ← and → move, Esc closes, Tab stays inside the viewer. A swipe moves on touch.
 * - A double tap (or double click) zooms 2,5× at that point and a drag pans; another double tap zooms out. Two fingers
 *   pinch between 1× and 4× around their midpoint (board `cd-f-viewer` frame 5); a pinch is never read as a tap or a
 *   swipe. Each finger is tracked by its pointer id: with one shared gesture, a spread of two fingers measured one
 *   finger against the other's start and changed the photo (found in the production review, 18.11.2026).
 * - Body scroll is locked while open; focus moves into the viewer and returns to the opener when it closes.
 *
 * It opens on the photo the gallery shows and reports the photo it closes on, so the gallery follows.
 */
export function CarPhotoViewer({
  images,
  title,
  start,
  onClose,
}: {
  images: string[];
  title: string;
  start: number;
  /** Called with the index the viewer closes on. */
  onClose: (index: number) => void;
}) {
  const [active, setActive] = useState(start);
  const [zoom, setZoom] = useState<{ x: number; y: number; scale: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  /** Every finger (or the mouse) on the stage, by pointer id. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** The gesture since the first finger went down; `multi` once a second one joined (a pinch). */
  const gesture = useRef<{ x: number; y: number; moved: boolean; multi: boolean } | null>(null);
  /** A pinch in progress: the fingers' distance and the zoom when it began. */
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const count = images.length;
  const titleId = "car-viewer-title";

  const go = useCallback(
    (delta: number) => {
      setZoom(null);
      setActive((i) => (i + delta + count) % count);
    },
    [count],
  );

  const close = useCallback(() => onClose(active), [onClose, active]);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Tab") {
        // The viewer is modal: Tab and Shift+Tab cycle through its own controls instead of walking into the page behind.
        const root = dialogRef.current;
        if (!root) return;
        const items = [...root.querySelectorAll<HTMLElement>("button:not([disabled]), [href]")].filter(
          (el) => el.offsetParent !== null,
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (e.shiftKey && (current === first || !root.contains(current))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (current === last || !root.contains(current))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go]);

  /** A 0–100% point of the stage under a viewport coordinate. */
  const pointAt = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  /** The distance between the first two fingers, and their midpoint. */
  const twoFingers = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 1) {
      gesture.current = { x: e.clientX, y: e.clientY, moved: false, multi: false };
    } else if (pointers.current.size === 2) {
      if (gesture.current) gesture.current.multi = true;
      pinch.current = { dist: twoFingers().dist || 1, scale: zoom?.scale ?? 1 };
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const { dist, mid } = twoFingers();
      const scale = Math.min(MAX_ZOOM, Math.max(1, (pinch.current.scale * dist) / pinch.current.dist));
      setZoom(scale <= 1.02 ? null : { ...pointAt(mid.x, mid.y), scale });
      return;
    }
    const g = gesture.current;
    if (!g) return;
    if (Math.abs(e.clientX - g.x) > 10 || Math.abs(e.clientY - g.y) > 10) g.moved = true;
    if (zoom) setZoom({ ...pointAt(e.clientX, e.clientY), scale: zoom.scale });
  };
  const releasePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(e);
    if (pointers.current.size > 0) return; // a finger is still down: the end of a pinch
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.multi) return; // a pinch is never a tap or a swipe
    const dx = e.clientX - g.x;
    // Un-zoomed, a horizontal swipe moves to the next or previous photo.
    if (!zoom && e.pointerType !== "mouse" && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(e.clientY - g.y)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (g.moved) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setZoom((z) => (z ? null : { ...pointAt(e.clientX, e.clientY), scale: ZOOM }));
    } else {
      lastTap.current = now;
    }
  };
  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(e);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const src = images[active];

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-99999 flex flex-col bg-bg text-tx"
    >
      <div className="flex min-h-15 flex-none items-center gap-4 py-2 pr-2 pl-4.5 sm:min-h-17 sm:py-3 sm:pr-4 sm:pl-6">
        <span id={titleId} className="min-w-0 flex-1 truncate text-[15px] leading-[1.3] font-extrabold">
          {title}
        </span>
        <span className="font-mono text-sm font-semibold whitespace-nowrap text-tx2 max-sm:hidden">
          {active + 1} / {count}
        </span>
        <IconButton ref={closeRef} label="Затворете" variant="over" onClick={close}>
          <CloseIcon />
        </IconButton>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className={`relative min-h-0 flex-1 touch-none overflow-hidden select-none ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
      >
        {/* Served directly from the source CDN, like the gallery. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={title}
          referrerPolicy="no-referrer"
          draggable={false}
          className={`absolute inset-y-0 left-0 size-full object-contain sm:left-24 sm:w-[calc(100%-192px)] ${zoom ? "opacity-0" : ""}`}
        />
        {zoom ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: `${zoom.scale * 100}%`,
              backgroundPosition: `${zoom.x}% ${zoom.y}%`,
            }}
          />
        ) : null}
        {count > 1 ? (
          <>
            <IconButton
              label="Предишна снимка"
              variant="over"
              size="lg"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => go(-1)}
              className="absolute top-1/2 left-2 -translate-y-1/2 sm:left-6"
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              label="Следваща снимка"
              variant="over"
              size="lg"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => go(1)}
              className="absolute top-1/2 right-2 -translate-y-1/2 sm:right-6"
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          {/* Phone: the counter. */}
          <div className="flex min-h-18.5 flex-none items-center justify-center pt-3 pb-[max(18px,env(safe-area-inset-bottom))] sm:hidden">
            <span className="inline-flex h-8 items-center rounded-sm bg-s2 px-3 font-mono text-[13.5px] font-semibold">
              {active + 1} / {count}
            </span>
          </div>
          {/* From 640 px: the thumbnails. Centred only while they fit (`safe center`): a centred row that overflows
              cuts its first thumbnails off on the left, where no scrolling reaches them. */}
          <div className="hidden flex-none justify-center-safe gap-2 overflow-x-auto px-6 pt-3.5 pb-5.5 scrollbar-none pointer-fine:scrollbar-thin sm:flex">
            {images.map((thumb, i) => (
              <button
                key={thumb}
                type="button"
                aria-label={`Снимка ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  setZoom(null);
                  setActive(i);
                }}
                className={`aspect-4/3 w-21 flex-none overflow-hidden rounded-md bg-s2 ${
                  i === active ? "opacity-100 shadow-[0_0_0_2px_var(--color-or)]" : "opacity-55"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
