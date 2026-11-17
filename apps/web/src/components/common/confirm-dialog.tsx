"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import { Button } from "./button";
import { IconButton } from "./icon-button";

/**
 * A small confirmation dialog — „are you sure?" over a single action (Components board, „Изскачащи прозорци"; boards
 * `ac-fav-flow`, `ab-dialogs`). Rendered via a portal to `document.body` so it always covers the full viewport, even
 * when triggered from deep inside a clipped or transformed subtree (a card with `overflow: hidden`).
 *
 * - The header holds the optional icon (in a tinted circle), or else the title, and ✕ to close.
 * - The footer holds the cancel button and the confirm button: negative for `tone="danger"`, primary otherwise. On a
 *   phone they stack full width, confirm on top.
 * - Cancelling is Esc, a press on the dimmed page, ✕, or the cancel button; confirming runs `onConfirm`.
 * - While `isPending`, both buttons are disabled and the confirm button reads „Моля изчакайте...".
 * - Focus starts on the cancel button, the safest default: a stray Enter cancels rather than confirms. Body scroll is
 *   locked while open, and nothing is mounted while closed.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Потвърдете",
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
  const titleId = useId();
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

  // Never mount the overlay when closed — `isOpen` only flips true after a user interaction (post-mount), so
  // `document.body` is guaranteed to exist.
  if (!isOpen) return null;

  const heading = (
    <h2 id={titleId} className="sa-dlg__t">
      {title}
    </h2>
  );

  return createPortal(
    <div className="fixed inset-0 z-99999 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div onClick={onCancel} className="sa-scrim" />

      <div className="sa-dlg animate-[saFadeIn_0.24s_ease] motion-reduce:animate-none">
        <div className="sa-dlg__h">
          {icon ? (
            <span
              className={`grid size-16 place-items-center rounded-full [&_svg]:size-7.5 ${
                tone === "danger" ? "bg-neg-w text-neg" : "bg-or-w text-ortx"
              }`}
            >
              {icon}
            </span>
          ) : (
            heading
          )}
          <IconButton label="Затворете" variant="ghost" onClick={onCancel} disabled={isPending}>
            <CloseIcon />
          </IconButton>
        </div>

        {icon || message ? (
          <div className="sa-dlg__b">
            {icon ? heading : null}
            {message ? <p className="sa-p">{message}</p> : null}
          </div>
        ) : null}

        <div className="sa-dlg__f">
          <Button ref={cancelRef} variant="sec" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "neg" : "pri"} onClick={onConfirm} disabled={isPending}>
            {isPending ? "Моля изчакайте..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
