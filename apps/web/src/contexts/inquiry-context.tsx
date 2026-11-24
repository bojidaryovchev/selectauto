"use client";

import { preload } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { loadContactStep } from "@/components/inquiry/inquiry-quiz/load-contact-step";
import { INQUIRY_LOGO } from "@/constants";
import { afterFirstPaint } from "@/lib/after-first-paint";
import type { InquiryPrefill } from "@/types";

type InquiryModalComponent = typeof import("@/components/inquiry/inquiry-modal").InquiryModal;

/**
 * The modal is deliberately NOT a static import. This provider is mounted in the
 * root layout, so a static import put the modal — and with it react-hook-form and
 * the whole of zod, ~80KB over the wire — in the initial bundle of EVERY page, to
 * be parsed before hydration for a dialog most visits never open. `import()` moves
 * it into its own chunk, fetched once (see the warm-up below) and cached here so
 * later opens resolve synchronously.
 */
let loadedModal: InquiryModalComponent | null = null;

function loadInquiryModal(): Promise<InquiryModalComponent> {
  return import("@/components/inquiry/inquiry-modal").then((mod) => {
    loadedModal = mod.InquiryModal;
    return loadedModal;
  });
}

/**
 * Site-wide provider for the "Безплатна консултация" inquiry modal. Mirrors the
 * original theme, where a single `#sa-inquiry-modal` lives in the footer and is
 * opened by any `[data-sa-open-inquiry]` / `.js-sa-open-inquiry` button across
 * the site. Mount once in the root layout; trigger with <InquiryButton> or the
 * `useInquiry()` hook.
 *
 * `open()` optionally takes an `InquiryPrefill` — when a car page opens the modal
 * with a brand+model, the quiz pre-answers those steps and starts at the budget
 * step (see `InquiryQuiz`). Called without an argument (header/footer/home CTAs)
 * it runs the generic quiz from the start.
 *
 * The /zapitvane page has the quiz on the page itself (InquiryPageQuiz). While it
 * is mounted it registers itself with `registerInline`, and a plain `open()` (the
 * header's „Запитване", the phone bar) scrolls to it instead of opening a second
 * quiz over the first (board `ac-zap-st`, figure 14). A car's `open(prefill)`
 * still opens the dialog.
 */
const InquiryContext = createContext<{
  open: (prefill?: InquiryPrefill) => void;
  /** Hands `open()` to the page's own quiz; returns the function that takes it back. */
  registerInline: (show: () => void) => () => void;
} | null>(null);

export function useInquiry() {
  const ctx = useContext(InquiryContext);
  if (!ctx) {
    throw new Error("useInquiry must be used within <InquiryProvider>");
  }
  return ctx;
}

export function InquiryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<InquiryPrefill | undefined>(undefined);
  // Null until the modal's chunk has arrived. Once set it stays set, so the modal
  // remains mounted across open/close exactly as it did as a static import.
  const [Modal, setModal] = useState<InquiryModalComponent | null>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // The page's own quiz, while /zapitvane is showing it.
  const inline = useRef<(() => void) | null>(null);
  const registerInline = useCallback((show: () => void) => {
    inline.current = show;
    return () => {
      if (inline.current === show) inline.current = null;
    };
  }, []);

  const open = useCallback((next?: InquiryPrefill) => {
    if (!next && inline.current) {
      inline.current();
      return;
    }
    setPrefill(next);
    setIsOpen(true);
    // Already fetched (the usual case — see the warm-up below): mount it in the
    // same render as `isOpen`, so the dialog appears on the very next frame.
    if (loadedModal) {
      setModal(() => loadedModal);
      return;
    }
    loadInquiryModal()
      .then((Component) => setModal(() => Component))
      .catch(() => {
        setIsOpen(false);
        toast.error("Формата не успя да се зареди. Моля, опитайте отново.");
      });
  }, []);

  // Warm the modal's logo and its code. <InquiryModal> renders null until opened,
  // so the browser would otherwise first request the image at the instant the
  // dialog appears — on a cold cache that is a blank box for the whole open
  // animation — and the dialog itself would wait on its chunk. Warming here (rather
  // than on hover of a trigger) is what makes it work on touch, where a tap gives no
  // lead time at all. Held until the page has painted and gone idle, at low
  // priority, so it never competes with the page's own LCP.
  useEffect(
    () =>
      afterFirstPaint(() => {
        preload(INQUIRY_LOGO.src, { as: "image", fetchPriority: "low" });
        // A failed warm-up is not an error: `open()` retries and reports it, and the
        // quiz retries its last step when it gets there.
        loadInquiryModal().catch(() => {});
        loadContactStep().catch(() => {});
      }),
    [],
  );

  const value = useMemo(() => ({ open, registerInline }), [open, registerInline]);

  return (
    <InquiryContext.Provider value={value}>
      {children}
      {Modal ? (
        <Modal isOpen={isOpen} prefill={prefill} onClose={close} />
      ) : isOpen ? (
        // Opened before the chunk arrived (a tap in the first moments of a slow
        // load): show the dimmed page and a spinner at once, so the tap visibly
        // lands (board `ac-float`, state 5). A press on it gives up.
        <div onClick={close} className="sa-scrim fixed z-99999 grid place-items-center">
          <span role="status" aria-label="Зареждане" className="grid place-items-center">
            <span className="sa-spin size-8 border-3 text-or" aria-hidden="true" />
          </span>
        </div>
      ) : null}
    </InquiryContext.Provider>
  );
}
