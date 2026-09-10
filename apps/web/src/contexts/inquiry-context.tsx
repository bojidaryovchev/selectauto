"use client";

import { preload } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { InquiryModal } from "@/components/inquiry/inquiry-modal";
import { INQUIRY_LOGO } from "@/constants";
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

  // Warm the modal's logo. <InquiryModal> renders null until opened, so the browser
  // would otherwise first request the image at the instant the dialog appears — on a
  // cold cache that is a blank box for the whole open animation. Preloading here
  // (rather than on hover of a trigger) is what makes it work on touch, where a tap
  // gives no lead time at all. Deferred to idle at low priority so it never competes
  // with the page's own LCP; requestIdleCallback only reached Safari in 17.4, hence
  // the timeout fallback.
  useEffect(() => {
    const warm = () =>
      preload(INQUIRY_LOGO.src, { as: "image", fetchPriority: "low" });

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <InquiryContext.Provider value={{ open }}>
      {children}
      <InquiryModal isOpen={isOpen} prefill={prefill} onClose={close} />
    </InquiryContext.Provider>
  );
}
