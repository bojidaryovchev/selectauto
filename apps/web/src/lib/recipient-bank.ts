/**
 * The bank fields a payment notice prints and can't do without (spec §10): while
 * any is empty, notice generation for the recipient is refused
 * (lib/prepare-notice.ts), and /admin/poluchateli flags the recipient beforehand
 * — one rule, so the warning and the refusal can't disagree.
 */
export function missingBankFields(r: {
  bankName: string | null;
  iban: string | null;
  swiftBic: string | null;
}): string[] {
  const missing: string[] = [];
  if (!r.bankName) missing.push("банка");
  if (!r.iban) missing.push("IBAN / сметка");
  if (!r.swiftBic) missing.push("SWIFT / BIC");
  return missing;
}
