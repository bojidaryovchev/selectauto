"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { InquiryModal } from "@/components/inquiry/inquiry-modal";
import type { InquiryPrefill } from "@/types";

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

  const open = useCallback((next?: InquiryPrefill) => {
    setPrefill(next);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <InquiryContext.Provider value={{ open }}>
      {children}
      <InquiryModal isOpen={isOpen} prefill={prefill} onClose={close} />
    </InquiryContext.Provider>
  );
}
