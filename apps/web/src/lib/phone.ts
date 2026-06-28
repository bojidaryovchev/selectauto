/**
 * Bulgarian phone helpers, shared by the Carfax form, the inquiry modal and the
 * server-side validators. Previously duplicated (verbatim) in three places:
 * CarfaxForm, InquiryModal and the carfax schema. Behaviour is unchanged — this
 * is the union of those copies.
 */

/**
 * Normalises a Bulgarian mobile number written as `08[7-9]XXXXXXX` into the
 * `+359…` form. Whitespace is stripped first. Non-matching input is returned
 * trimmed/unspaced but otherwise untouched, matching the original handlers.
 */
export function normalizePhone(phone: string): string {
  const normalized = phone.trim().replace(/\s+/g, "");
  if (/^08[7-9]\d{7}$/.test(normalized)) {
    return "+359" + normalized.substring(1);
  }
  return normalized;
}

/** True for a fully-qualified BG mobile (`+359[7-9]XXXXXXXX`). */
export function isValidPhone(phone: string): boolean {
  return /^\+359[7-9]\d{8}$/.test(phone);
}
