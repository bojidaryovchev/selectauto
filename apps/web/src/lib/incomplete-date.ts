/**
 * Whether a date field holds a half-typed date (a day and a month without the year, say). The browser then reports its
 * value as "", exactly like an empty field, so a form with `noValidate` would send it as empty, and the server takes
 * an empty date as today (a contract, a deposit, a payment) or keeps the old one on an edit. Only `validity.badInput`
 * tells the two apart. Found in the production review, 18.11.2026: the admin's forms gained `noValidate` for their own
 * field errors, which also dropped the browser's block on an incomplete date.
 */
export function isIncompleteDate(input: Element | null | undefined): input is HTMLInputElement {
  return input instanceof HTMLInputElement && input.type === "date" && input.validity.badInput;
}
