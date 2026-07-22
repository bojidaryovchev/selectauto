"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/common";
import { CloseIcon } from "@/components/icons";
import type { MarketId, UsAuction, VehicleType } from "@/data/import-rates";
import { CostEstimator } from "./cost-estimator";

/**
 * Per-listing import-calculator dialog — opens the full <CostEstimator> over a car,
 * pre-seeded with THIS car's price + market + vehicle-type size class (still a
 * general tool once open: every input stays editable).
 *
 * Chrome mirrors the Carfax / inquiry modals: portal to `document.body` (so a
 * trigger deep inside the clipped/sticky aside still covers the viewport), blurred
 * backdrop, Escape + body-scroll lock, and only mounts while open. A PINNED header
 * sits over a scrollable body so the close button stays reachable on the tall form.
 * Centred card from 641px up (wide enough for the estimator's two-column layout on
 * desktop); on phones (≤640px) it fills the viewport edge-to-edge (`h-dvh`, square
 * corners) with safe-area-aware padding.
 */
export function CalculatorDialog({
  isOpen,
  onClose,
  defaultPrice,
  defaultMarket,
  defaultVehicleType,
  defaultAuction,
  defaultUsLocation,
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
  carLabel?: string;
  lotNumber?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

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
    <div className="fixed inset-0 z-99999" role="dialog" aria-modal="true" aria-labelledby="sa-calc-dialog-title">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(8,10,14,0.72)] backdrop-blur-lg" />

      {/* Dialog — flex column: pinned header over a scrollable body. */}
      <div className="relative z-2 mx-auto mt-[5vh] flex max-h-[min(88vh,860px)] w-[min(100%-24px,960px)] flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,250,0.98)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.8)] max-[640px]:mt-0 max-[640px]:h-dvh max-[640px]:max-h-dvh max-[640px]:w-full max-[640px]:rounded-none max-[640px]:shadow-none">
        {/* Pinned header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 px-7 pb-4 pt-6 max-[640px]:px-4.5 max-[640px]:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h2 id="sa-calc-dialog-title" className="text-[22px] font-black text-[#17181b] max-md:text-xl">
              Калкулатор за внос
            </h2>
            {carLabel ? (
              <p className="mt-1 truncate text-sm text-muted">
                <span className="font-bold text-ink">{carLabel}</span>
                {lotNumber ? ` · Лот № ${lotNumber}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">Ориентировъчна оценка на разходите до България.</p>
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

        {/* Scrollable body — the full estimator, rendered bare (the dialog is the card). */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 pt-5 max-[640px]:px-4.5 max-[640px]:pb-[max(1.125rem,env(safe-area-inset-bottom))]">
          <CostEstimator
            bare
            defaultPrice={defaultPrice}
            defaultMarket={defaultMarket}
            defaultVehicleType={defaultVehicleType}
            defaultAuction={defaultAuction}
            defaultUsLocation={defaultUsLocation}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
