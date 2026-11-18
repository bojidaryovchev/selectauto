"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/common";
import { CloseIcon } from "@/components/icons";
import { CarfaxForm } from "@/components/carfax/carfax-form";
import type { CarfaxFormValues } from "@/schemas/carfax.schema";

/**
 * In-page Carfax inquiry dialog — the same form as the /carfax page, opened over a car (or a VIN-check result) so the
 * visitor never leaves (boards `in-vin-dlg`, `in-vin-carfax`). The car's VIN/make/model arrive pre-filled and locked
 * (read-only): the buyer only adds name/phone/email. Whichever of `vin`/`make`/`model` is passed gets seeded + locked;
 * the rest stay editable (e.g. the VIN-check tool knows only the VIN).
 *
 * The kit's dialog from 640 px, full screen on a phone: portalled to `document.body` (so a trigger deep inside a
 * clipped card still covers the viewport), Escape and a press outside close it, body scroll is locked, focus moves to
 * „Затворете" and returns to the trigger on close (CarfaxInquiryButton). On a successful submit the form calls back
 * and the dialog closes after 2,5 s. Mounted only while open.
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
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

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
    <div className="fixed inset-0 z-99999 flex items-start justify-center sm:px-6 sm:py-[5vh]">
      <div className="sa-scrim" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-carfax-dialog-title"
        className="sa-dlg max-h-[min(90vh,900px)] max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none"
      >
        {/* Pinned header */}
        <div className="sa-dlg__h flex-none border-b border-hair pt-5.5 pr-4 pb-4 pl-6 max-sm:pt-[max(16px,env(safe-area-inset-top))] max-sm:pr-3 max-sm:pb-3.5 max-sm:pl-4.5">
          <div className="min-w-0">
            <h2 id="sa-carfax-dialog-title" className="sa-dlg__t max-sm:text-xl">
              Заявете Carfax проверка
            </h2>
            {carLabel ? (
              <p className="mt-1.5 truncate text-sm/snug text-tx2">
                <b className="font-extrabold text-tx">{carLabel}</b>
                {lotNumber ? ` · Лот № ${lotNumber}` : ""}
              </p>
            ) : (
              <p className="mt-1.5 text-sm/snug text-tx2">Оставете данни за контакт и ще се свържем с вас.</p>
            )}
          </div>
          <IconButton ref={closeRef} label="Затворете" variant="ghost" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Scrollable body — the shared form, one field per row, pre-filled and locked. */}
        <div className="sa-dlg__b min-h-0 flex-1 px-6 pt-5 pb-6 max-sm:px-4.5 max-sm:pb-[max(18px,env(safe-area-inset-bottom))]">
          <CarfaxForm stack defaults={defaults} lockedFields={lockedFields} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
