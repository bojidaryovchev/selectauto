"use client";

import { useEffect, useRef, useState } from "react";
import { Button, IconButton, buttonClasses } from "@/components/common";
import { CirclePlayIcon, CloseIcon, ExternalLinkIcon, Rotate3dIcon } from "@/components/icons";
import type { CarMedia } from "@/types/car-detail.type";

/**
 * Extra media buttons under the gallery (boards `cd-iaai`, `cd-f-media`, `cd-f-media-d`): the IAAI 360° spin viewer and
 * the engine-run video (`images.external_panorama_url` / `images.video`). Each opens in an in-page dialog — the 360° as
 * an embedded iframe, the video as an inline `<video>` — full screen on a phone, a centred 16:9 card from 640 px.
 * Because an upstream host MAY refuse framing (X-Frame-Options) or the video URL may not be a direct file, every
 * dialog also carries „Отворете в нов раздел", so the media is always reachable. Esc, ✕ or a press outside the card
 * close it, and focus returns to the button that opened it. Renders nothing when the lot has neither (Copart often has
 * only video; ENCAR has neither).
 */
export function CarMediaStrip({ media }: { media: CarMedia }) {
  const [open, setOpen] = useState<null | "360" | "video">(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const has360 = !!media.panorama360;
  const hasVideo = !!media.engineVideo;

  // Close on Escape, lock body scroll, move focus into the dialog and back to its opener when it closes.
  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus();
    };
  }, [open]);

  if (!has360 && !hasVideo) return null;

  const url = open === "360" ? media.panorama360 : open === "video" ? media.engineVideo : undefined;
  const title = open === "360" ? "360° оглед" : "Видео на двигател";
  const newTab = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant: "txt", size: "md" })}
    >
      Отворете в нов раздел
      <ExternalLinkIcon />
    </a>
  );

  return (
    <div className="flex flex-wrap gap-2.5">
      {has360 ? (
        <Button
          variant="ton"
          size="md"
          onClick={(e) => {
            openerRef.current = e.currentTarget;
            setOpen("360");
          }}
        >
          <Rotate3dIcon />
          360° оглед
        </Button>
      ) : null}
      {hasVideo ? (
        <Button
          variant="ton"
          size="md"
          onClick={(e) => {
            openerRef.current = e.currentTarget;
            setOpen("video");
          }}
        >
          <CirclePlayIcon />
          Видео на двигател
        </Button>
      ) : null}

      {open && url ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-99999 grid place-items-center bg-scrim backdrop-blur-[3px] sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex size-full flex-col overflow-hidden bg-bg sm:size-auto sm:max-h-[90vh] sm:w-[min(100%,896px)] sm:rounded-xl sm:border sm:border-hair2 sm:shadow-pop"
          >
            <div className="flex flex-none items-center justify-between gap-3 py-2.5 pr-2.5 pl-4.5 max-sm:pt-[max(10px,env(safe-area-inset-top))]">
              <b className="text-[15px] font-extrabold whitespace-nowrap">{title}</b>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:contents">{newTab}</span>
                <IconButton ref={closeRef} label="Затворете" variant="ghost" onClick={() => setOpen(null)}>
                  <CloseIcon />
                </IconButton>
              </div>
            </div>
            {/* The media fills the screen on a phone; 16:9 from 640 px. */}
            <div className="w-full flex-1 bg-black sm:aspect-video sm:flex-none">
              {open === "video" ? (
                <video src={url} controls autoPlay className="size-full object-contain" />
              ) : (
                <iframe src={url} title={title} className="size-full border-0" allowFullScreen />
              )}
            </div>
            <div className="flex-none px-4 pt-3.5 pb-[max(18px,env(safe-area-inset-bottom))] sm:hidden">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "sec", block: true })}
              >
                Отворете в нов раздел
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
