/**
 * Optional context for the inquiry quiz when it's opened from a specific car's page (its „Направете заявка" link
 * carries it to /zapitvane in the address's fragment; lib/inquiry-link.ts). When `brand` + `model` are both present,
 * the quiz pre-answers the "specific model? → brand → model" steps and opens directly at the budget step, showing a
 * banner that names the car (`carLabel` + `lotNumber`). Absent (or missing brand/model) → the quiz from the start.
 */
export type InquiryPrefill = {
  brand?: string;
  model?: string;
  /** Banner label, e.g. "BMW 320 (2021)". */
  carLabel?: string;
  lotNumber?: string;
  /** The make's logo, for the banner's plate (null or absent: the make's letters). */
  makeLogo?: string | null;
  /** The car's page, e.g. "/avtomobil/18026705": the inquiry records it as the page it came from, as the dialog did. */
  carPath?: string;
};
