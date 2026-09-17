/**
 * `price_dds` („Възможност за данъчен кредит") — the VAT statement mobile.bg
 * prints under an advert's price. The field is REQUIRED by `advertpub`, yet the
 * API's dictionary lists only "1", "2" and "3", with no labels.
 *
 * The meaning comes from mobile.bg's own public search (checked 2026-09-17):
 *  - `?price_dds=3` returns only adverts labelled „Цената е без ДДС";
 *  - `?price_dds=2` is their „Само с възможност за данъчен кредит" filter and
 *    returns „Цената е с включено ДДС" (and „без ДДС", which also allows a tax
 *    credit) but never „Не се начислява ДДС";
 *  - which leaves 1 for „Не се начислява ДДС" — and `?price_dds=1` matches the
 *    unfiltered mix, consistent with it being the private-seller default.
 *
 * It is a public tax statement made on the company's behalf, so the mapper never
 * picks one: an admin does. Kept free of server-only imports because the
 * publisher's dropdown is a client component.
 */
export const PRICE_DDS_OPTIONS = [
  { value: "2", label: "Цената е с включено ДДС" },
  { value: "3", label: "Цената е без ДДС" },
  { value: "1", label: "Не се начислява ДДС" },
] as const;
