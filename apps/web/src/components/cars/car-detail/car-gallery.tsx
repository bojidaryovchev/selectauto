"use client";

import { useCallback, useRef, useState } from "react";
import { IconButton } from "@/components/common";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, ZoomInIcon } from "@/components/icons";
import { CarPhotoViewer } from "./car-photo-viewer";

/**
 * The car page's photo gallery (boards `cd-*`, `cd-f-gallery`, `cd-f-gallery-d`): a large photo that **zooms in place**
 * (the pointer pans a magnified view over the photo, no popup), the arrows, the counter, the thumbnails, and the
 * full-screen viewer (owner decision 22). The photo list comes from the lot's raw_json (5–20 photos for almost every
 * car). The active photo eager-loads (LCP candidate); the rest lazy-load.
 *
 * The magnifier is a second layer with the same image as a scaled `background-image`, its `background-position`
 * driven by the pointer:
 *
 * - **Mouse (pointer: fine)** — it fades in on hover and pans with the cursor; a click opens the viewer.
 * - **Touch (pointer: coarse)** — a *tap* toggles it on/off and a drag pans it, with the finger acting as the lens.
 *   Everything runs on pointer events gated by `pointerType`, because a tap also makes the browser synthesise
 *   `mouseenter`/`mousemove`: on mouse-only handlers that turned zoom on, faded the base `<img>` out, and left a blank
 *   frame — the image "disappeared" on tap.
 * - **„Отворете снимките на цял екран"** (top right) opens the viewer on every device. Whether a phone tap should
 *   open the viewer instead of zooming here is owner point 5 (REDESIGN.md), still open, so the tap keeps today's zoom.
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
  // Live touch gesture: where it started, whether it has moved past the tap slop,
  // and whether zoom was already on when it began (so a tap can toggle correctly).
  const touch = useRef<{ x: number; y: number; moved: boolean; wasZooming: boolean } | null>(null);
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

  // Touch gestures start here. Zoom is deliberately NOT armed on pointerdown: while
  // un-zoomed the frame still scrolls the page, and the browser would cancel the
  // gesture mid-way, leaving the lens stuck on. It's decided on pointerup instead.
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      lastPointer.current = e.pointerType;
      if (e.pointerType === "mouse") return;
      touch.current = { x: e.clientX, y: e.clientY, moved: false, wasZooming: zooming };
      // Capture so a pan keeps tracking even if the finger strays over the arrows
      // or off the frame entirely.
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [zooming],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") {
        aim(e.clientX, e.clientY);
        return;
      }
      const t = touch.current;
      if (!t) return;
      if (Math.abs(e.clientX - t.x) > TAP_SLOP || Math.abs(e.clientY - t.y) > TAP_SLOP) {
        t.moved = true;
      }
      // Only a zoomed frame pans; otherwise the drag belongs to the page scroll.
      if (t.wasZooming) aim(e.clientX, e.clientY);
    },
    [aim],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return;
      const t = touch.current;
      touch.current = null;
      if (!t || t.moved) return;
      // A clean tap toggles: zoom in centred on the tap, or back out.
      if (t.wasZooming) {
        setZooming(false);
      } else {
        aim(e.clientX, e.clientY);
        setZooming(true);
      }
    },
    [aim],
  );

  const onPointerCancel = useCallback(() => {
    touch.current = null;
  }, []);

  const openViewer = (opener: HTMLButtonElement | null) => {
    openerRef.current = opener;
    setZooming(false);
    setViewerOpen(true);
  };

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
      {/* Main photo: hover to zoom with a mouse (a click opens the viewer), tap to zoom on touch. Full bleed on a
          phone. */}
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
        // While zoomed, the frame owns touch moves (so a drag pans the lens instead
        // of scrolling the page); un-zoomed it stays out of the way of page scroll.
        style={{ touchAction: zooming ? "none" : undefined }}
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
