"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

/**
 * A small, reusable confirmation modal — "are you sure?" over a single action.
 * Rendered via a portal to `document.body` so it always covers the full viewport:
 * it can be triggered from deep inside a clipped/transformed subtree (e.g. a card
 * with `overflow-hidden` + a hover `transform`, which would otherwise clip a plain
 * `fixed` overlay or make it position relative to the card).
 *
 * Matches the inquiry modal's chrome (blurred backdrop, rounded card, Escape +
 * body-scroll lock). Cancelling = Escape, backdrop click, or the cancel button;
 * confirming runs `onConfirm`. The confirm button can show a pending state and be
 * tinted "danger" (for removals) or "brand" (default). Only mounts its DOM while
 * `isOpen`, so it's inert when closed.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Потвърди",
  cancelLabel = "Отказ",
  tone = "brand",
  icon,
  isPending = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "brand" | "danger";
  icon?: React.ReactNode;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Focus the cancel button on open (safest default — a stray Enter cancels, it
  // doesn't confirm the action) and lock body scroll + wire Escape while open.
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onCancel]);

  // Never mount the overlay when closed — `isOpen` only flips true after a
  // user interaction (post-mount), so `document.body` is guaranteed to exist.
  if (!isOpen) return null;

  const iconWrap =
    tone === "danger"
      ? "bg-[#fdecea] text-[#c0392b]"
      : "bg-brand/10 text-brand";
  const confirmBtn =
    tone === "danger"
      ? "bg-linear-to-r from-[#c0392b] to-[#e05545] shadow-[0_12px_28px_rgba(192,57,43,0.28)]"
      : "bg-linear-to-r from-brand-dark to-brand shadow-[0_12px_28px_rgba(216,111,22,0.22)]";

  return createPortal(
    <div className="fixed inset-0 z-99999" role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title">
      {/* Backdrop */}
      <div onClick={onCancel} className="absolute inset-0 bg-[rgba(8,10,14,0.72)] backdrop-blur-lg" />

      {/* Dialog card — centered, capped width, phone-friendly side gutters. */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative z-2 w-[min(100%,420px)] animate-[saFadeIn_0.24s_ease] overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,250,0.98)_100%)] p-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.8)] max-[420px]:p-6">
          {icon ? (
            <div className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${iconWrap}`}>
              {icon}
            </div>
          ) : null}

          <h2 id="sa-confirm-title" className="mb-2 text-[22px] font-extrabold text-[#17181b] max-[420px]:text-xl">
            {title}
          </h2>

          {message ? (
            <p className="mx-auto mb-6 max-w-[34ch] text-[15px] leading-[1.6] text-[#555962]">{message}</p>
          ) : (
            <div className="mb-6" />
          )}

          <div className="flex gap-3 max-[400px]:flex-col-reverse">
            <Button
              ref={cancelRef}
              onClick={onCancel}
              disabled={isPending}
              rippleTheme="dark"
              className="min-h-13 flex-1 rounded-full border border-line bg-white px-5 text-[15px] font-extrabold text-[#333] transition-transform duration-200 hover:-translate-y-0.5 hover:text-brand-dark disabled:opacity-60"
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isPending}
              rippleTheme="light"
              className={`min-h-13 flex-1 rounded-full px-5 text-[15px] font-extrabold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 ${confirmBtn}`}
            >
              {isPending ? "Моля изчакайте..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
