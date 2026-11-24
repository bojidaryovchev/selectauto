import type { InquiryPrefill } from "@/types/inquiry.type";

/**
 * Where every „Запитване" leads (owner decision 41): the /zapitvane page, the only place the quiz lives.
 *
 * A car page's link carries its car in the address's fragment (`#make=…&model=…`), not its query: the fragment never
 * reaches the server or a crawler, so the page stays one static page, and the ~1M car pages don't hand Google a
 * million /zapitvane variants to crawl. The page reads it back on the client (InquiryPageQuiz) and opens the quiz at
 * the budget step with the car's banner, as the dialog did.
 *
 * No imports beyond a type, so the unit test can load it as it is (tests/inquiry-link.test.mts).
 */
export const INQUIRY_PATH = "/zapitvane";

/** Fired on /zapitvane when a plain „Запитване" is pressed there: the page's card comes into view (InquiryPageQuiz). */
export const INQUIRY_REVEAL_EVENT = "sa:inquiry-reveal";

/** The fragment's keys. */
const KEYS = { make: "make", model: "model", label: "car", lot: "lot", logo: "logo", path: "from" } as const;

/** A label read back from an address: printable, one line, of a sane length. */
const TEXT = /^[^\u0000-\u001f\u007f]{1,80}$/;
const LOT = /^[A-Za-z0-9-]{1,24}$/;
/** Only the site's own logo files: an address must not be able to put any image on the page. */
const LOGO = /^\/brand-logos\/[a-z0-9-]+\.(svg|webp|png)$/;
/** Only a car page of this site. */
const CAR_PATH = /^\/avtomobil\/\d{1,12}$/;

/** The link for „Запитване": the page, with the car in the fragment when there is one. */
export function inquiryHref(prefill?: InquiryPrefill): string {
  if (!prefill?.brand || !prefill.model) return INQUIRY_PATH;
  const params = new URLSearchParams();
  params.set(KEYS.make, prefill.brand);
  params.set(KEYS.model, prefill.model);
  if (prefill.carLabel) params.set(KEYS.label, prefill.carLabel);
  if (prefill.lotNumber) params.set(KEYS.lot, prefill.lotNumber);
  if (prefill.makeLogo && LOGO.test(prefill.makeLogo)) params.set(KEYS.logo, prefill.makeLogo);
  if (prefill.carPath && CAR_PATH.test(prefill.carPath)) params.set(KEYS.path, prefill.carPath);
  return `${INQUIRY_PATH}#${params.toString()}`;
}

/**
 * The car a fragment carries (`location.hash`, with or without its `#`), or undefined. Anything malformed is left out:
 * no make or model means no car at all, and a bad label, lot, logo or path just goes missing.
 */
export function prefillFromHash(hash: string): InquiryPrefill | undefined {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return undefined;
  const params = new URLSearchParams(raw);
  const get = (key: string, rule: RegExp) => {
    const value = params.get(key)?.trim();
    return value && rule.test(value) ? value : undefined;
  };
  const brand = get(KEYS.make, TEXT);
  const model = get(KEYS.model, TEXT);
  if (!brand || !model) return undefined;
  return {
    brand,
    model,
    carLabel: get(KEYS.label, TEXT),
    lotNumber: get(KEYS.lot, LOT),
    makeLogo: get(KEYS.logo, LOGO) ?? null,
    carPath: get(KEYS.path, CAR_PATH),
  };
}
