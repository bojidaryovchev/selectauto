"use client";

import { preload } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
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
 * step (see `InquiryModal`). Called without an argument (header/footer/home CTAs)
 * it runs the generic quiz from the start.
 */
const InquiryContext = createContext<{
  open: (prefill?: InquiryPrefill) => void;
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

  const open = useCallback((next?: InquiryPrefill) => {
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
        toast.error("Формата не успя да се зареди. Моля опитайте отново.");
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
        // A failed warm-up is not an error: `open()` retries and reports it.
        loadInquiryModal().catch(() => {});
      }),
    [],
  );

  return (
    <InquiryContext.Provider value={{ open }}>
      {children}
      {Modal ? (
        <Modal isOpen={isOpen} prefill={prefill} onClose={close} />
      ) : isOpen ? (
        // Opened before the chunk arrived (a tap in the first moments of a slow
        // load): show the modal's own backdrop at once so the tap visibly lands.
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-99999 bg-[rgba(8,10,14,0.72)] backdrop-blur-lg"
        />
      ) : null}
    </InquiryContext.Provider>
  );
}
