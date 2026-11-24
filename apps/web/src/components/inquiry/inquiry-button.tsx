"use client";

import type { MouseEvent, ReactNode } from "react";
import { LinkButton } from "@/components/common";
import type { ButtonStyleProps } from "@/components/common";
import { INQUIRY_PATH, INQUIRY_REVEAL_EVENT, inquiryHref } from "@/lib/inquiry-link";
import type { InquiryPrefill } from "@/types";

/**
 * Every „Запитване" on the site: a link to the /zapitvane page, where the quiz lives (owner decision 41). Server
 * components (homepage, footer, hubs, contacts) drop it in as they did the dialog's button.
 *
 * Pass `prefill` (from a car page) and the link carries the car (lib/inquiry-link.ts): the page opens at the budget
 * step with the car's banner. On /zapitvane itself a plain one doesn't navigate: the page's card comes into view and its
 * question takes the focus (InquiryPageQuiz). `onClick` runs first (the phone menu closes itself with it).
 */
export function InquiryButton({
  className,
  children,
  rippleTheme,
  prefill,
  onClick,
  variant,
  size,
  block,
}: {
  className?: string;
  children: ReactNode;
  /** Forwarded to the underlying link's legacy look — set "light" on dark/brand surfaces. */
  rippleTheme?: "dark" | "light";
  /** Car context to pre-answer the quiz with (brand/model). Omit for the quiz from the start. */
  prefill?: InquiryPrefill;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
} & ButtonStyleProps) {
  const href = inquiryHref(prefill);
  return (
    <LinkButton
      href={href}
      className={className}
      rippleTheme={rippleTheme}
      variant={variant}
      size={size}
      block={block}
      onClick={(event) => {
        onClick?.(event);
        if (href === INQUIRY_PATH && window.location.pathname === INQUIRY_PATH) {
          event.preventDefault();
          window.dispatchEvent(new Event(INQUIRY_REVEAL_EVENT));
        }
      }}
    >
      {children}
    </LinkButton>
  );
}
