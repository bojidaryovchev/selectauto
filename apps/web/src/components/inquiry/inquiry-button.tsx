"use client";

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
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useInquiry();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
