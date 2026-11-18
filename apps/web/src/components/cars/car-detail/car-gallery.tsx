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
 * - **Touch and pen** — a tap opens the viewer, where a double tap or a pinch zooms and a drag pans (owner point 5,
 *   decided 18.11.2026 as drawn on `cd-f-gallery` / `cd-f-viewer`: one tap can't both zoom here and open the viewer).
 *   A drag still scrolls the page. The zoom runs on pointer events gated by `pointerType === "mouse"`, because a tap
 *   also makes the browser synthesise `mouseenter`/`mousemove`: on mouse-only handlers that once turned the zoom on,
 *   faded the base `<img>` out, and left a blank frame.
 * - **„Отворете снимките на цял екран"** (top right) opens the viewer on every device.
 *
 * Client component — it owns the selected-index, zoom and viewer state.
 */

/** How far the hover lens magnifies (2.4× reads as "premium store" without losing context). */
const ZOOM = 2.4;

export function CarGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Pointer position as a 0-100% fraction within the frame (drives background-position).
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

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

  /** Opens the viewer; it hands the focus back to `opener` when it closes. */
  const openViewer = useCallback((opener: HTMLButtonElement | null) => {
    openerRef.current = opener;
    setZooming(false);
    setViewerOpen(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") aim(e.clientX, e.clientY);
    },
    [aim],
  );

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
        onPointerMove={onPointerMove}
        // A click or a tap opens the viewer. On `click`, not `pointerup`: a tap that only stops a flick-scroll gets
        // pointer events but no click, so it no longer opens the viewer by mistake (production review, 18.11.2026).
        // The focus comes back to the full-screen button when it closes; the photo itself isn't focusable.
        onClick={(e) => openViewer(e.currentTarget.querySelector<HTMLButtonElement>(".sa-gal__fs"))}
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

        {/* Zoom layer: the same image as a magnified background, panned by the mouse (touch zooms in the viewer). It
            is what replaces the base image once that fades. */}
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
            pressing one never also opens the viewer from the photo behind it. */}
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
        // A mouse gets main's thin scrollbar back: without one, thumbnails past the strip's edge were out of a wheel
        // user's reach (production review, 18.11.2026). Touch scrolls the strip by swiping, as drawn. The kit's 4px
        // padding keeps the scrollbar off the thumbnails and gives the selected one's ring room.
        <div className="sa-gal__th pointer-fine:scrollbar-thin">
          {images.map((thumb, i) => (
            <button
              key={thumb}
              type="button"
              // A thumbnail half past the strip's edge comes fully into view (with the kit's 4px scroll padding, its
              // ring too) once clicked, and when keyboard focus lands on it: the browser leaves a partly visible one
              // where it is. After the click, not on press: scrolling between press and release would move another
              // thumbnail under the pointer and lose the click.
              onClick={(e) => {
                select(i);
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              onFocus={(e) => {
                if (e.currentTarget.matches(":focus-visible")) e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
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
 * re-arms it. Gated to `pointerType === "mouse"`: a tap also synthesises enter/leave. The press and the click stop
 * here, so the photo behind never sees them: a click there opens the viewer.
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
