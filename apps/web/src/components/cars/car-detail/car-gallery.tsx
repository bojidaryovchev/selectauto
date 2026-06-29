"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/common";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * The detail-page image gallery — a premium e-commerce experience: a large main
 * image that **zooms in place on hover** (the cursor pans a magnified view
 * directly over the image, no popup/lightbox), plus a thumbnail strip and arrow
 * navigation. The image list comes from the lot's raw_json (5-20 photos for almost
 * every car). The active image eager-loads (LCP candidate); the rest lazy-load.
 *
 * Hover-zoom is desktop-only (pointer: fine): a second layer with the same image
 * as a scaled `background-image` fades in while hovering, its `background-position`
 * driven by the cursor. Touch devices just see the crisp base image (no hover).
 *
 * Client component (the page's only interactive part) — it owns the selected-index
 * and zoom state.
 */

/** sizes for the main image: full column width up to the 2-col layout breakpoint. */
const MAIN_SIZES = "(min-width: 1024px) 60vw, 100vw";

/** How far the hover lens magnifies (2.4× reads as "premium store" without losing context). */
const ZOOM = 2.4;

export function CarGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  // Cursor position as a 0-100% fraction within the frame (drives background-position).
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement | null>(null);

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

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLens({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a2d33] to-[#15171b] text-sm font-semibold uppercase tracking-wider text-white/35">
        Снимка при поискване
      </div>
    );
  }

  const src = images[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image (hover to zoom) */}
      <div
        ref={frameRef}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
        className="group relative cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-[#f4f4f4]"
      >
        <Image
          key={src}
          src={src}
          alt={alt}
          width={960}
          height={720}
          sizes={MAIN_SIZES}
          loading="eager"
          fetchPriority="high"
          className={`block aspect-[4/3] w-full object-cover transition-opacity duration-200 ${
            zooming ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Zoom layer: the same image as a magnified background, panned by the
            cursor. Hidden on touch (no hover) and faded in only while zooming. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 hidden bg-no-repeat transition-opacity duration-200 [@media(pointer:fine)]:block ${
            zooming ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${ZOOM * 100}%`,
            backgroundPosition: `${lens.x}% ${lens.y}%`,
          }}
        />

        {/* Prev/next arrows (only with >1 image). Hidden while zooming so they
            don't sit over the magnified view. */}
        {count > 1 ? (
          <div className={zooming ? "opacity-0 transition-opacity" : "opacity-100 transition-opacity"}>
            <GalleryArrow side="left" onClick={prev} />
            <GalleryArrow side="right" onClick={next} />
          </div>
        ) : null}

        {/* Image counter */}
        {count > 1 ? (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
            {active + 1} / {count}
          </span>
        ) : null}

        {/* Hover hint (desktop only, fades out on hover) */}
        <span className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white/90 transition-opacity duration-200 group-hover:opacity-0 [@media(pointer:fine)]:block">
          Задръж за увеличение
        </span>
      </div>

      {/* Thumbnail strip */}
      {count > 1 ? (
        <div className="grid grid-flow-col auto-cols-[88px] gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {images.map((thumb, i) => (
            <Button
              key={thumb}
              onClick={() => setActive(i)}
              aria-label={`Снимка ${i + 1}`}
              aria-current={i === active}
              className={`rounded-lg border-2 transition ${
                i === active ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={thumb}
                alt=""
                width={88}
                height={66}
                sizes="88px"
                loading="lazy"
                className="block aspect-[4/3] w-[88px] object-cover"
              />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A circular prev/next control overlaid on the gallery. The chevron icon is
 * centered via `grid place-items-center` so it sits dead-center in the button.
 */
function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <Button
      rippleTheme="light"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === "left" ? "Предишна снимка" : "Следваща снимка"}
      className={`absolute top-1/2 z-[2] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? (
        <ChevronLeftIcon className="h-5 w-5" />
      ) : (
        <ChevronRightIcon className="h-5 w-5" />
      )}
    </Button>
  );
}
