"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/common";
import { CloseIcon } from "@/components/icons";
import { CarfaxForm } from "@/components/carfax/carfax-form";
import type { CarfaxFormValues } from "@/schemas/carfax.schema";

/**
 * In-page Carfax inquiry modal — the same form as the /carfax page, opened over a
 * car (or a VIN-check result) so the visitor never leaves. The car's VIN/make/model
 * arrive pre-filled and locked (read-only): the buyer only adds name/phone/email.
 * Whichever of `vin`/`make`/`model` is passed gets seeded + locked; the rest stay
 * editable (e.g. the VIN-check tool knows only the VIN).
 *
 * Chrome mirrors ConfirmDialog / the inquiry modal: portal to `document.body`
 * (so a trigger deep inside a clipped/transformed card still covers the viewport),
 * blurred backdrop, Escape + body-scroll lock, and only mounts while open. On a
 * successful submit the form calls back and the dialog auto-closes after a beat.
 */
export function CarfaxDialog({
  isOpen,
  onClose,
  vin,
  make,
  model,
  lotNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  vin?: string;
  make?: string;
  model?: string;
  lotNumber?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll, focus the close button, and wire Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // Clear any pending auto-close timer if the dialog unmounts first.
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Never mount the overlay when closed — `isOpen` only flips true after a user
  // interaction (post-mount), so `document.body` is guaranteed to exist.
  if (!isOpen) return null;

  // Seed + lock whichever identifiers we have. VIN is upper-cased to match the
  // form's own normalization (and the schema's format check).
  const defaults: Partial<CarfaxFormValues> = {};
  const lockedFields: (keyof CarfaxFormValues)[] = [];
  if (vin) {
    defaults.vin = vin.trim().toUpperCase();
    lockedFields.push("vin");
  }
  if (make) {
    defaults.car_make = make;
    lockedFields.push("car_make");
  }
  if (model) {
    defaults.car_model = model;
    lockedFields.push("car_model");
  }

  const carLabel = [make, model].filter(Boolean).join(" ");

  const handleSuccess = () => {
    closeTimer.current = setTimeout(onClose, 2500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-99999"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sa-carfax-dialog-title"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(8,10,14,0.72)] backdrop-blur-lg" />

      {/* Dialog — a flex column: a PINNED header over a scrollable body, so the
          close button stays reachable on tall forms. Centred card from 641px up;
          on phones (≤640px) it fills the viewport edge-to-edge (`h-dvh`, square
          corners), with header/body padding honouring the notch + home-indicator
          safe-area insets — matching the site's inquiry modal. */}
      <div className="relative z-2 mx-auto mt-[5vh] flex max-h-[min(88vh,820px)] w-[min(100%-24px,560px)] flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,250,0.98)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.8)] max-[640px]:mt-0 max-[640px]:h-dvh max-[640px]:max-h-dvh max-[640px]:w-full max-[640px]:rounded-none max-[640px]:shadow-none">
        {/* Pinned header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 px-7 pb-4 pt-6 max-[640px]:px-4.5 max-[640px]:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h2 id="sa-carfax-dialog-title" className="text-[22px] font-black text-[#17181b] max-md:text-xl">
              Заяви Carfax проверка
            </h2>
            {carLabel ? (
              <p className="mt-1 truncate text-sm text-muted">
                <span className="font-bold text-ink">{carLabel}</span>
                {lotNumber ? ` · Лот № ${lotNumber}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">Остави данни за контакт и ще се свържем с теб.</p>
            )}
          </div>
          <Button
            ref={closeRef}
            aria-label="Затвори"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f2f4] text-[#6f747c] transition-all duration-200 hover:-translate-y-px hover:bg-[#e8eaee] hover:text-[#17181b]"
          >
            <CloseIcon className="size-4.5" />
          </Button>
        </div>

        {/* Scrollable body — the shared form, stacked + pre-filled/locked. */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 pt-5 max-[640px]:px-4.5 max-[640px]:pb-[max(1.125rem,env(safe-area-inset-bottom))]">
          <CarfaxForm stack defaults={defaults} lockedFields={lockedFields} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
