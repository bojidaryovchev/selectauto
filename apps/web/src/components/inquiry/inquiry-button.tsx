"use client";

import { Button } from "@/components/common";
import { useInquiry } from "@/contexts/inquiry-context";
import type { InquiryPrefill } from "@/types";

/**
 * Thin client wrapper around a button that opens the site-wide inquiry modal.
 * Lets server components (homepage, footer, contacts page) drop in a "Запитване"
 * trigger without becoming client components themselves. Pass `className` to
 * match the surrounding button styling.
 *
 * Pass `prefill` (from a car page) to open the quiz pre-answered for that car —
 * the brand/model steps are skipped and the modal starts at the budget step.
 */
export function InquiryButton({
  className,
  children,
  rippleTheme,
  prefill,
}: {
  className?: string;
  children: React.ReactNode;
  /** Forwarded to the underlying Button — set "light" on dark/brand surfaces. */
  rippleTheme?: "dark" | "light";
  /** Car context to pre-answer the quiz with (brand/model). Omit for the generic flow. */
  prefill?: InquiryPrefill;
}) {
  const { open } = useInquiry();
  return (
    <Button
      onClick={() => open(prefill)}
      className={className}
      rippleTheme={rippleTheme}
    >
      {children}
    </Button>
  );
}
