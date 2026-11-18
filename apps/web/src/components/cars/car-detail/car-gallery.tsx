"use client";

import { useCallback, useRef, useState } from "react";
import { IconButton } from "@/components/common";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, ZoomInIcon } from "@/components/icons";
import { CarPhotoViewer } from "./car-photo-viewer";

/**
 * The car page's photo gallery (boards `cd-*`, `cd-f-gallery`, `cd-f-gallery-d`): a large photo, the arrows, the
 * counter, the thumbnails, and the full-screen viewer (owner decision 22). The photo list comes from the lot's raw_json
 * (5–20 photos for almost every car). The active photo eager-loads (LCP candidate); the rest lazy-load.
 *
 * - **Mouse (pointer: fine)** — the photo **zooms in place**: a second layer with the same image as a scaled
 *   `background-image` fades in on hover and pans with the cursor. A click opens the viewer.
 * - **Touch and pen** — a tap opens the viewer, where a double tap zooms and a drag pans (owner point 5, decided
 *   18.11.2026 as drawn on `cd-f-gallery` / `cd-f-viewer`: one tap can't both zoom here and open the viewer). A drag
 *   still scrolls the page. Everything runs on pointer events gated by `pointerType`, because a tap also makes the
 *   browser synthesise `mouseenter`/`mousemove`: on mouse-only handlers that once turned the zoom on, faded the base
 *   `<img>` out, and left a blank frame.
 * - **„Отворете снимките на цял екран"** (top right) opens the viewer on every device.
 *
 * Client component — it owns the selected-index, zoom and viewer state.
 */

/** How far the hover lens magnifies (2.4× reads as "premium store" without losing context). */
const ZOOM = 2.4;

/** Finger travel (px) above which a touch counts as a pan, not a tap. */
const TAP_SLOP = 10;

export function CarGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Pointer position as a 0-100% fraction within the frame (drives background-position).
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  // Live touch gesture: where it started and whether it has moved past the tap slop (a drag scrolls the page).
  const touch = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  // The last pointer that pressed the photo: a click opens the viewer only for a mouse (Safari's click events carry
  // no pointerType, so it's read from pointerdown).
  const lastPointer = useRef("");

  const count = images.length;
  const clamp = useCallback((i: number) => (i + count) % count, [count]);
  // Selecting a different image also drops the zoom (so the lens never flashes the
  // previous photo mid-transition) — done here in the setter, not a post-render effect.
  const select = useCallback((i: number) => {
    setActive(i);
    setZooming(false);
  }, []);
  const prev = useCallback(() => select(clamp(active - 1)), [select, clamp, active]);
  const next = useCallback(() => select(clamp(active + 1)), [select, clamp, active]);

  /** Point the lens at a viewport coordinate, clamped to the frame. */
  const aim = useCallback((clientX: number, clientY: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setLens({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  const onPointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") setZooming(true);
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") setZooming(false);
  }, []);

  const openViewer = useCallback((opener: HTMLButtonElement | null) => {
    openerRef.current = opener;
    setZooming(false);
    setViewerOpen(true);
  }, []);

  // A touch or pen gesture starts here; whether it was a tap is decided on pointerup (a drag scrolls the page, and the
  // browser may cancel it mid-way).
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    lastPointer.current = e.pointerType;
    if (e.pointerType === "mouse") return;
    touch.current = { x: e.clientX, y: e.clientY, moved: false };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") {
        aim(e.clientX, e.clientY);
        return;
      }
      const t = touch.current;
      if (t && (Math.abs(e.clientX - t.x) > TAP_SLOP || Math.abs(e.clientY - t.y) > TAP_SLOP)) t.moved = true;
    },
    [aim],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return;
      const t = touch.current;
      touch.current = null;
      // A clean tap opens the viewer; zooming happens there.
      if (t && !t.moved) openViewer(null);
    },
    [openViewer],
  );

  const onPointerCancel = useCallback(() => {
    touch.current = null;
  }, []);

  if (count === 0) {
    return (
      <div className="flex aspect-4/3 flex-col items-center justify-center gap-2.5 rounded-lg bg-s2 text-sm font-bold text-tx3 max-sm:-mx-gutter max-sm:rounded-none [&_svg]:size-7.5">
        <CameraIcon />
        Снимка при поискване
      </div>
    );
  }

  const src = images[active];

  return (
    <div className="sa-gal">
      {/* Main photo: hover to zoom with a mouse (a click opens the viewer); a tap opens the viewer on touch. Full
          bleed on a phone. */}
      <div
        ref={frameRef}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={() => {
          // A mouse click opens the viewer; taps are handled by the pointer handlers above.
          if (lastPointer.current === "mouse") openViewer(null);
        }}
        className={`sa-gal__main select-none max-sm:-mx-gutter max-sm:rounded-none ${zooming ? "cursor-zoom-out" : "cursor-zoom-in"}`}
      >
        {/* Served directly from the source CDN — no Vercel optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={alt}
          width={960}
          height={720}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${zooming ? "opacity-0" : "opacity-100"}`}
        />

        {/* Zoom layer: the same image as a magnified background, panned by the pointer (cursor on desktop, finger on
            touch). It must render on every pointer type, since it's what replaces the base image once that fades. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-no-repeat transition-opacity duration-200 ease-out motion-reduce:transition-none ${
            zooming ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${ZOOM * 100}%`,
            backgroundPosition: `${lens.x}% ${lens.y}%`,
          }}
        />

        {/* Controls sit above the zoom layer and stay usable during zoom: with a mouse the photo is only reachable
            while hovering, which is exactly when zoom is on. Hovering one drops the zoom, like leaving the photo;
            pressing one is never a tap-to-zoom. */}
        {count > 1 ? (
          <>
            <GalleryControl label="Предишна снимка" className="sa-gal__nav is-l" onHoverChange={setZooming} onClick={prev}>
              <ChevronLeftIcon />
            </GalleryControl>
            <GalleryControl label="Следваща снимка" className="sa-gal__nav is-r" onHoverChange={setZooming} onClick={next}>
              <ChevronRightIcon />
            </GalleryControl>
            <span className="sa-gal__n pointer-events-none">
              {active + 1} / {count}
            </span>
          </>
        ) : null}

        <GalleryControl
          label="Отворете снимките на цял екран"
          className="sa-gal__fs"
          onHoverChange={setZooming}
          onClick={(e) => openViewer(e.currentTarget)}
        >
          <Maximize2Icon />
        </GalleryControl>

        {/* Zoom hint — worded per pointer type, and gone once the lens is open. */}
        <span
          className={`sa-gal__hint pointer-events-none hidden transition-opacity duration-200 ease-out pointer-fine:inline-flex ${zooming ? "opacity-0" : "opacity-100"}`}
        >
          <ZoomInIcon />
          Задръжте за увеличение
        </span>
        <span
          className={`sa-gal__hint pointer-events-none hidden transition-opacity duration-200 ease-out pointer-coarse:inline-flex ${zooming ? "opacity-0" : "opacity-100"}`}
        >
          <ZoomInIcon />
          Докоснете за увеличение
        </span>
      </div>

      {/* Thumbnail strip */}
      {count > 1 ? (
        <div className="sa-gal__th">
          {images.map((thumb, i) => (
            <button
              key={thumb}
              type="button"
              onClick={() => select(i)}
              aria-label={`Снимка ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              // 92 px thumbnails (the kit), 76 px on a phone (boards `cd-*`).
              className={`max-sm:w-19! ${i === active ? "is-on" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt=""
                width={88}
                height={66}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      ) : null}

      {viewerOpen ? (
        <CarPhotoViewer
          images={images}
          title={alt}
          start={active}
          onClose={(index) => {
            setViewerOpen(false);
            setActive(index);
            openerRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * A control over the photo (an arrow, the viewer opener). Hovering one with a mouse drops the image zoom (like leaving
 * the picture), so the magnified lens isn't panning under the control you're aiming at; moving back onto the photo
 * re-arms it. Gated to `pointerType === "mouse"`: a tap also synthesises enter/leave. `pointerdown` stops here, so
 * pressing a control is never read as a tap-to-zoom on the photo behind it, and the click doesn't reach the photo.
 */
function GalleryControl({
  label,
  className,
  onHoverChange,
  onClick,
  children,
}: {
  label: string;
  className: string;
  /** Called with `false` when the mouse enters the control, `true` when it leaves. */
  onHoverChange: (zooming: boolean) => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <IconButton
      label={label}
      title={label}
      variant="over"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onHoverChange(false);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onHoverChange(true);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`z-2 ${className}`}
    >
      {children}
    </IconButton>
  );
}
