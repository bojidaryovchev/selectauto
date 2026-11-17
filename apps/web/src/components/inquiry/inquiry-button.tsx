"use client";

import { Button } from "@/components/common";
import type { ButtonStyleProps } from "@/components/common";
import { useInquiry } from "@/contexts/inquiry-context";
import type { InquiryPrefill } from "@/types";

/**
 * Thin client wrapper around a button that opens the site-wide inquiry modal.
 * Lets server components (homepage, footer, contacts page) drop in a "Запитване"
 * trigger without becoming client components themselves.
 *
 * Pass a `variant` (and `size`, `block`) for a „Нощно шосе" button; without one it
 * keeps the legacy look, styled by `className`, until its page is rebuilt.
 *
 * Pass `prefill` (from a car page) to open the quiz pre-answered for that car —
 * the brand/model steps are skipped and the modal starts at the budget step.
 */
export function InquiryButton({
  className,
  children,
  rippleTheme,
  prefill,
  variant,
  size,
  block,
}: {
  className?: string;
  children: React.ReactNode;
  /** Forwarded to the underlying Button's legacy look — set "light" on dark/brand surfaces. */
  rippleTheme?: "dark" | "light";
  /** Car context to pre-answer the quiz with (brand/model). Omit for the generic flow. */
  prefill?: InquiryPrefill;
} & ButtonStyleProps) {
  const { open } = useInquiry();
  return (
    <Button
      onClick={() => open(prefill)}
      className={className}
      rippleTheme={rippleTheme}
      variant={variant}
      size={size}
      block={block}
    >
      {children}
    </Button>
  );
}
