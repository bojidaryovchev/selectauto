"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { INQUIRY_REVEAL_EVENT, prefillFromHash } from "@/lib/inquiry-link";
import type { InquiryPrefill } from "@/types";
import { InquiryQuiz } from "./inquiry-quiz";
import { revealQuiz } from "./inquiry-quiz/reveal-quiz";

/**
 * The quiz as a card on the /zapitvane page (boards `ac-zap`, `ac-zap-st`, `ac-zap-flow`, `ac-zap-tab`; parity check
 * docs/design/parity/zapitvane.md), where every „Запитване" on the site leads (owner decision 41).
 *
 * - A car page's link carries its car in the address's fragment (lib/inquiry-link.ts). It is read after mounting,
 *   before the first paint of a client-side visit, so the quiz opens at the budget step with the car's banner; a page
 *   loaded straight from such a link shows the first question until it hydrates. A later change of the fragment (the
 *   browser's history) starts the quiz again for that car.
 * - On this page a plain „Запитване" (header, phone menu, footer, phone bar) doesn't navigate: it fires
 *   INQUIRY_REVEAL_EVENT, and the card comes into view with its question focused — one frame later, so a phone menu
 *   that is closing first is gone.
 *
 * `id` is what the phone bar watches.
 */
export function InquiryPageQuiz({ id }: { id: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [prefill, setPrefill] = useState<InquiryPrefill | undefined>(undefined);
  // The quiz is keyed by the car (or none), so a new car starts it afresh.
  const [quizKey, setQuizKey] = useState("");

  useLayoutEffect(() => {
    const read = () => {
      const car = prefillFromHash(window.location.hash);
      setPrefill(car);
      setQuizKey(car ? window.location.hash : "");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    const reveal = () =>
      requestAnimationFrame(() => {
        const card = cardRef.current;
        if (card) revealQuiz(card, card.querySelector<HTMLElement>("[data-iq-focus]") ?? card);
      });
    window.addEventListener(INQUIRY_REVEAL_EVENT, reveal);
    return () => window.removeEventListener(INQUIRY_REVEAL_EVENT, reveal);
  }, []);

  return (
    <div ref={cardRef} id={id} tabIndex={-1} className="ac-zp-card outline-none">
      <InquiryQuiz key={quizKey} containerRef={cardRef} prefill={prefill} />
    </div>
  );
}
