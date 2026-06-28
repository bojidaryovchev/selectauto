"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { InquiryModal } from "@/components/inquiry/inquiry-modal";

/**
 * Site-wide provider for the "Безплатна консултация" inquiry modal. Mirrors the
 * original theme, where a single `#sa-inquiry-modal` lives in the footer and is
 * opened by any `[data-sa-open-inquiry]` / `.js-sa-open-inquiry` button across
 * the site. Mount once in the root layout; trigger with <InquiryButton> or the
 * `useInquiry()` hook.
 */
const InquiryContext = createContext<{ open: () => void } | null>(null);

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

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <InquiryContext.Provider value={{ open }}>
      {children}
      <InquiryModal isOpen={isOpen} onClose={close} />
    </InquiryContext.Provider>
  );
}
