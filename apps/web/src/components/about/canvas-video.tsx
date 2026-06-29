"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Renders a looping background video onto a <canvas> instead of a raw <video>.
 *
 * Why canvas: on Chromium/Windows a native <video> layer gets promoted/demoted
 * during fast scroll, which makes the compositor repaint the whole page (visible
 * full-window flicker). A canvas is a plain raster layer that never triggers that
 * video-layer promotion, so the flicker goes away.
 *
 * Perf design (mirrors airagro's VideoCanvas, plus an offscreen pause):
 *  - Canvas backing store is sized in CSS pixels (DPR = 1), NOT device pixels.
 *    A full-bleed hero at 2x DPR would otherwise allocate a ~4K canvas and force
 *    drawImage to upscale every frame — that is the lag. The browser scales the
 *    displayed canvas up for us; the softness is invisible for a video bg.
 *  - Painting is throttled to `fps` (default 24, ~the source frame rate) via a
 *    timestamp gate, so we don't redraw on every 60/120Hz rAF tick.
 *  - drawImage crops in SOURCE space (9-arg form) for object-cover with no extra
 *    overdraw.
 *  - An IntersectionObserver pauses decode + the paint loop while offscreen.
 *  - A poster image crossfades out once the first frame is ready.
 */
export function CanvasVideo({
  src,
  poster,
  className = "",
  fps = 24,
}: {
  src: string;
  poster?: string;
  className?: string;
  fps?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const onscreenRef = useRef<boolean>(false);

  const [isReady, setIsReady] = useState(false);

  const frameInterval = 1000 / fps;

  // Draw one frame with object-cover behaviour, cropping in source space.
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;
    if (video.readyState < 2) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const cw = Math.round(rect.width);
    const ch = Math.round(rect.height);
    if (cw === 0 || ch === 0) return;

    // Backing store in CSS pixels (DPR=1) — the displayed canvas is scaled by CSS.
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return;

    const containerRatio = cw / ch;
    const videoRatio = vw / vh;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (containerRatio > videoRatio) {
      // Container wider than video — crop top/bottom.
      sh = vw / containerRatio;
      sy = (vh - sh) / 2;
    } else {
      // Container taller than video — crop left/right.
      sw = vh * containerRatio;
      sx = (vw - sw) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  }, []);

  // Throttled paint loop — runs only while onscreen.
  useEffect(() => {
    if (!isReady) return;

    const loop = (timestamp: number) => {
      if (!onscreenRef.current) return; // stopped; restarted by the IO callback
      const elapsed = timestamp - lastFrameRef.current;
      if (elapsed >= frameInterval) {
        lastFrameRef.current = timestamp - (elapsed % frameInterval);
        drawFrame();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    // Pause decode + paint while the card is scrolled out of view.
    const container = containerRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (entry.isIntersecting) {
          if (onscreenRef.current) return;
          onscreenRef.current = true;
          void video?.play().catch(() => {});
          lastFrameRef.current = 0;
          rafRef.current = requestAnimationFrame(loop);
        } else {
          onscreenRef.current = false;
          cancelAnimationFrame(rafRef.current);
          video?.pause();
        }
      },
      { threshold: 0.01 },
    );
    if (container) io.observe(container);

    return () => {
      cancelAnimationFrame(rafRef.current);
      io.disconnect();
      onscreenRef.current = false;
    };
  }, [isReady, drawFrame, frameInterval]);

  // Initialize the (detached) decode source.
  useEffect(() => {
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";

    const onCanPlay = () => setIsReady(true);
    video.addEventListener("canplay", onCanPlay);

    videoRef.current = video;
    video.load();

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.pause();
      video.src = "";
      videoRef.current = null;
    };
  }, [src]);

  // Repaint on container resize (covers the paused/offscreen case too).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => drawFrame());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawFrame]);

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Poster — eager-loaded, fades out once the first frame is ready. */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- remote host not in next/image allowlist; decorative bg.
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
          style={{ opacity: isReady ? 0 : 1 }}
        />
      )}

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full transition-opacity duration-700 ease-out"
        style={{ opacity: isReady ? 1 : 0 }}
      />
    </div>
  );
}
