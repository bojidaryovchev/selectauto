/**
 * Keeps the /zapitvane page's quiz card in view when it moves to a new step, and when the page's „Запитване" asks for
 * it (InquiryPageQuiz); then focuses `target` (the current question, or the card) without a second jump.
 *
 * The card's top comes up under the header (its `scroll-margin-top`, 68 px under 1024 px and 96 px above) when:
 * - it has gone under the header or off the screen (a long list scrolled away, then a short one), or
 * - the step now ends below the fold — above the bottom tabs on phones and tablets — while the card could move up.
 *   On a phone that is the first answer: at the landing the card starts halfway down, and the 16 makes after „Да"
 *   would show only 6 (board `ac-zap-flow`, frames 2–7, and notes/ac-zap.md §5.1). From under the header every step
 *   fits the screen, so it moves once.
 */
export function revealQuiz(card: HTMLElement, target: HTMLElement): void {
  const rect = card.getBoundingClientRect();
  const margin = parseFloat(getComputedStyle(card).scrollMarginTop) || 0;
  const tabs = window.matchMedia("(max-width: 1023.98px)").matches
    ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-nav")) || 0
    : 0;
  const fold = window.innerHeight - tabs;
  const hidden = rect.top < margin - 1;
  const cutOff = rect.bottom > fold && rect.top > margin + 1;
  if (hidden || cutOff) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }
  target.focus({ preventScroll: true });
}
