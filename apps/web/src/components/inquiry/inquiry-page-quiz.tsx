"use client";

import { useEffect, useRef } from "react";
import { useInquiry } from "@/contexts/inquiry-context";
import { InquiryQuiz } from "./inquiry-quiz";
import { revealQuiz } from "./inquiry-quiz/reveal-quiz";

/**
 * The quiz as a card on the /zapitvane page (boards `ac-zap`, `ac-zap-st`, `ac-zap-flow`, `ac-zap-tab`; parity check
 * docs/design/parity/zapitvane.md): the shared InquiryQuiz in its `page` variant, the first question already showing.
 *
 * While it is on the page it takes over the plain „Запитване" (the header's, the phone menu's, the phone bar's): instead
 * of a dialog over the page, the card comes into view and its current question takes the focus. One frame later, so a
 * phone menu that is closing first is gone. `id` is what the phone bar watches.
 */
export function InquiryPageQuiz({ id }: { id: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { registerInline } = useInquiry();

  useEffect(
    () =>
      registerInline(() => {
        requestAnimationFrame(() => {
          const card = cardRef.current;
          if (!card) return;
          revealQuiz(card, card.querySelector<HTMLElement>("[data-iq-focus]") ?? card);
        });
      }),
    [registerInline],
  );

  return (
    <div ref={cardRef} id={id} tabIndex={-1} className="ac-zp-card outline-none">
      <InquiryQuiz variant="page" containerRef={cardRef} />
    </div>
  );
}
