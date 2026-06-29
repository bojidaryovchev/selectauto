"use client";

import { Button } from "@/components/common";
import { useInquiry } from "@/contexts/inquiry-context";

/**
 * Thin client wrapper around a button that opens the site-wide inquiry modal.
 * Lets server components (homepage, footer, contacts page) drop in a "Запитване"
 * trigger without becoming client components themselves. Pass `className` to
 * match the surrounding button styling.
 */
export function InquiryButton({
  className,
  children,
  rippleTheme,
}: {
  className?: string;
  children: React.ReactNode;
  /** Forwarded to the underlying Button — set "light" on dark/brand surfaces. */
  rippleTheme?: "dark" | "light";
}) {
  const { open } = useInquiry();
  return (
    <Button onClick={open} className={className} rippleTheme={rippleTheme}>
      {children}
    </Button>
  );
}
