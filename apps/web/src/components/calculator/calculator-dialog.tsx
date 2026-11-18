"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/common";
import { CloseIcon } from "@/components/icons";
import type { MarketId, UsAuction, VehicleType } from "@/data/import-rates";
import { CostEstimator, type EstimateSummary } from "./cost-estimator";

/**
 * Per-listing import-calculator dialog — opens the full <CostEstimator> over a car,
 * pre-seeded with THIS car's price + market + vehicle-type size class (still a
 * general tool once open: every input stays editable).
 *
 * Boards `im-dialog`, `im-dialog-states`, `im-dialog-flow`: from 640 px the kit's dialog (960 px) over the dimmed page,
 * its header — „Калкулатор за внос", the car and its lot — pinned over the scrolling estimator; on a phone it fills
 * the screen and a footer under the form keeps the total in view (or the prompt that stands in for it).
 *
 * Portalled to `document.body` (so a trigger deep inside the sticky buy box still covers the viewport), Escape and a
 * press outside close it, body scroll is locked, and focus moves to „Затворете"; the trigger takes it back
 * (CarImportCalculator). Mounted only while open.
 */
export function CalculatorDialog({
  isOpen,
  onClose,
  defaultPrice,
  defaultMarket,
  defaultVehicleType,
  defaultAuction,
  defaultUsLocation,
  defaultCaFromBc,
  carLabel,
  lotNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** USD pre-seed for the price field; omitted when the lot has no price yet. */
  defaultPrice?: number;
  defaultMarket?: MarketId;
  defaultVehicleType?: VehicleType;
  /** This lot's auction house (Copart/IAAI) — presets the auction control. */
  defaultAuction?: UsAuction;
  /** This lot's yard zip/city/state — preselects the US location dropdown. */
  defaultUsLocation?: { zip?: string; city?: string; state?: string };
  /** Canada only: the lot is in British Columbia — presets the province control. */
  defaultCaFromBc?: boolean;
  carLabel?: string;
  lotNumber?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [summary, setSummary] = useState<EstimateSummary>({});

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

  // Never mount the overlay when closed — `isOpen` only flips true after a user
  // interaction (post-mount), so `document.body` is guaranteed to exist.
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-start justify-center sm:px-6 sm:py-[5vh]">
      <div className="sa-scrim" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-calc-dialog-title"
        className="sa-dlg sa-dlg--xl im-dlg max-h-[min(90vh,900px)] max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none"
      >
        {/* Pinned header */}
        <div className="sa-dlg__h flex-none max-sm:pt-[max(16px,env(safe-area-inset-top))] max-sm:pr-3 max-sm:pb-3.5 max-sm:pl-4.5">
          <div className="min-w-0">
            <h2 id="sa-calc-dialog-title" className="sa-dlg__t max-sm:text-xl">
              Калкулатор за внос
            </h2>
            {carLabel ? (
              <p className="im-dlg__car">
                <b>{carLabel}</b>
                {lotNumber ? (
                  <>
                    {" "}
                    · Лот № <span className="sa-mono">{lotNumber}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="im-dlg__sub">Ориентировъчна оценка на разходите до България.</p>
            )}
          </div>
          <IconButton ref={closeRef} label="Затворете" variant="ghost" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Scrollable body — the full estimator, rendered bare (the dialog is the card). */}
        <div className="sa-dlg__b min-h-0 flex-1 max-sm:px-4.5 max-sm:pt-4.5 max-sm:pb-6">
          <CostEstimator
            bare
            defaultPrice={defaultPrice}
            defaultMarket={defaultMarket}
            defaultVehicleType={defaultVehicleType}
            defaultAuction={defaultAuction}
            defaultUsLocation={defaultUsLocation}
            defaultCaFromBc={defaultCaFromBc}
            onSummary={setSummary}
          />
        </div>

        {/* Phone: the total stays in view while the form scrolls (or the prompt that stands in for it). */}
        {summary.totalUsd || summary.prompt ? (
          <div className="im-dlgph__f pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden" role="status">
            {summary.totalUsd ? (
              <>
                <span>Общо (ориентир)</span>
                <b>{summary.totalUsd}</b>
              </>
            ) : (
              <p>{summary.prompt}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
