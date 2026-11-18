"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/common";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";

/** Zoom of a double tap or double click inside the viewer. */
const ZOOM = 2.5;
/** Finger travel (px) that makes a swipe: anything shorter is a tap. */
const SWIPE = 40;
/** Two taps within this many ms are a double tap. */
const DOUBLE_TAP_MS = 300;

/**
 * The full-screen photo viewer (owner decision 22; boards `cd-f-viewer`, `cd-f-viewer-d`): the car's title, the
 * counter and ✕ „Затворете" on top, the photo fitted to the screen with „Предишна снимка" / „Следваща снимка", the
 * thumbnails underneath (from 640 px; a phone shows the counter instead).
 *
 * - Keys: ← and → move, Esc closes. A swipe moves on touch.
 * - A double tap (or double click) zooms 2,5× at that point and a drag pans; another double tap zooms out.
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
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
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

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    gesture.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (Math.abs(e.clientX - g.x) > 10 || Math.abs(e.clientY - g.y) > 10) g.moved = true;
    if (zoom) setZoom(pointAt(e.clientX, e.clientY));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
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
      setZoom((z) => (z ? null : pointAt(e.clientX, e.clientY)));
    } else {
      lastTap.current = now;
    }
  };

  const src = images[active];

  return createPortal(
    <div
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
        onPointerCancel={() => (gesture.current = null)}
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
            style={{ backgroundImage: `url(${src})`, backgroundSize: `${ZOOM * 100}%`, backgroundPosition: `${zoom.x}% ${zoom.y}%` }}
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
          {/* From 640 px: the thumbnails. */}
          <div className="hidden flex-none justify-center gap-2 overflow-x-auto px-6 pt-3.5 pb-5.5 scrollbar-none sm:flex">
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
