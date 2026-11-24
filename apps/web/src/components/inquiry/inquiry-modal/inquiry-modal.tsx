"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { InquiryQuiz } from "@/components/inquiry/inquiry-quiz";
import type { InquiryPrefill } from "@/types";

/**
 * Site-wide "Безплатна консултация" dialog (boards `ac-inq-desk`, `ac-inq-desk2`, `ac-inq-quiz`, `ac-inq-send`,
 * `ac-inq-tab`; parity check docs/design/parity/inquiry.md). Rendered once near the root and opened by any
 * "Запитване" button via the `useInquiry()` context. The steps are the shared quiz (InquiryQuiz, which the /zapitvane
 * page shows too); this is its frame.
 *
 * The look: a 560 px dialog at the top of the screen (it doesn't jump as the steps change height), full screen on a
 * phone, over the dimmed page; a press on the scrim or Escape closes it, and the page doesn't scroll behind it. Focus
 * moves into the dialog on open, to each new question, and back to what opened it on close.
 *
 * Nothing renders while it is closed, so each open mounts the quiz afresh: the start screen, or the budget step when a
 * car page passes a `prefill`.
 */
export function InquiryModal({
  isOpen,
  onClose,
  prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  prefill?: InquiryPrefill;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // Focus into the dialog on open, and back to whatever opened it on close. A layout effect, so it runs before the
  // quiz's own effect moves the focus on to the question, and still sees the opener as the focused element.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => opener?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-99999 flex items-start justify-center px-6 pt-18 pb-6 max-sm:p-0">
      {/* The dimmed page; a press on it closes the dialog. */}
      <div onClick={onClose} className="sa-scrim" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Безплатна консултация"
        className="ac-iqd max-h-[min(792px,calc(100dvh-96px))] outline-none max-sm:max-h-none"
      >
        <InquiryQuiz variant="dialog" containerRef={dialogRef} prefill={prefill} onClose={onClose} />
      </div>
    </div>
  );
}
