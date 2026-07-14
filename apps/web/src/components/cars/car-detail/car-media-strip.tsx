"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/common";
import { CloseIcon, PanoramaIcon, PlayIcon } from "@/components/icons";
import type { CarMedia } from "@/types/car-detail.type";

/**
 * Extra media buttons under the gallery: the IAAI 360° spin viewer and the
 * engine-run video (`images.external_panorama_url` / `images.video`). Instead of
 * opening a new tab, each opens in an in-page modal — the 360° as an embedded iframe,
 * the video as an inline `<video>`. Because an upstream host MAY refuse framing
 * (X-Frame-Options) or the video URL may not be a direct file, every modal also
 * carries an "open in new tab" fallback so the media is always reachable. Renders
 * nothing when the lot has neither (Copart often has only video; ENCAR has neither).
 */
export function CarMediaStrip({ media }: { media: CarMedia }) {
  const [open, setOpen] = useState<null | "360" | "video">(null);
  const has360 = !!media.panorama360;
  const hasVideo = !!media.engineVideo;

  // Close on Escape + lock body scroll while a modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!has360 && !hasVideo) return null;

  const url = open === "360" ? media.panorama360 : open === "video" ? media.engineVideo : undefined;
  const title = open === "360" ? "360° оглед" : "Видео на двигател";

  return (
    <div className="flex flex-wrap gap-2.5">
      {has360 ? (
        <Button
          onClick={() => setOpen("360")}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
        >
          <PanoramaIcon className="size-4.5 text-brand" />
          360° оглед
        </Button>
      ) : null}
      {hasVideo ? (
        <Button
          onClick={() => setOpen("video")}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark"
        >
          <PlayIcon className="size-4.5 text-brand" />
          Видео на двигател
        </Button>
      ) : null}

      {open && url ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm sm:p-4"
        >
          {/* Full-screen on mobile (size-full, square corners); a centred card from `sm` up. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex size-full flex-col overflow-hidden bg-[#111] shadow-card-strong sm:size-auto sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 max-sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
              <span className="text-sm font-bold text-white">{title}</span>
              <div className="flex items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-semibold text-white/60 underline underline-offset-2 hover:text-white"
                >
                  Отвори в нов раздел
                </a>
                <Button
                  rippleTheme="light"
                  onClick={() => setOpen(null)}
                  aria-label="Затвори"
                  className="grid size-8 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <CloseIcon className="size-4" />
                </Button>
              </div>
            </div>
            {/* Media fills the screen on mobile (flex-1); fixed 16:9 on desktop. */}
            <div className="w-full flex-1 bg-black sm:aspect-video sm:flex-none">
              {open === "video" ? (
                <video src={url} controls autoPlay className="size-full object-contain" />
              ) : (
                <iframe src={url} title={title} className="size-full border-0" allowFullScreen />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
