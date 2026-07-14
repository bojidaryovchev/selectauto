/**
 * Optional context handed to the site-wide inquiry modal when it's opened from a
 * specific car's page. When `brand` + `model` are both present, the modal
 * pre-answers the "specific model? → brand → model" quiz steps and opens directly
 * at the budget step, showing a banner that names the car (`carLabel` + `lotNumber`).
 * Absent (or missing brand/model) → the modal runs the generic quiz from the start.
 */
export type InquiryPrefill = {
  brand?: string;
  model?: string;
  /** Banner label, e.g. "BMW 320 (2021)". */
  carLabel?: string;
  lotNumber?: string;
};
