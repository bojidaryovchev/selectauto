/**
 * The hand-typed advert price, read the way a Bulgarian types it.
 *
 * The field used to be parsed with `Number(text.replace(",", "."))`, which was
 * wrong for both local ways of writing thousands (proven live, 24.09.2026):
 *  - „28 500" was NaN and silently DROPPED, so the calculated price went out
 *    instead and a correction answered „без промени";
 *  - „28.500" became 28.5 and put 29 € on the public advert.
 *
 * So thousands separators (space, dot, comma, apostrophe) are understood, an
 * ambiguous or unreadable value is REFUSED instead of guessed, and anything under
 * `MIN_MANUAL_PRICE_EUR` is refused too: no car we import costs that, so such a
 * number can only be a typing slip. Kept free of server-only imports because the
 * publisher's price field uses it as the admin types.
 */

/** The lowest believable advert price. Below this the input is a slip. */
export const MIN_MANUAL_PRICE_EUR = 500;

export type ParsedPrice =
  | { kind: "empty" }
  | { kind: "ok"; eur: number }
  | { kind: "invalid"; message: string };

export function parseManualPrice(input: string): ParsedPrice {
  // Spaces of every width (the bg-BG locale formats with U+00A0 / U+202F), the
  // currency, and apostrophes used as thousands marks.
  const text = input
    .replace(/[\s  ']/g, "")
    .replace(/€|eur|евро/gi, "");
  if (!text) return { kind: "empty" };

  let eur: number | null = null;
  if (/^\d+$/.test(text)) {
    eur = Number(text);
  } else if (/^\d{1,3}([.,]\d{3})+$/.test(text)) {
    // „28.500" / „28,500" / „1.250.000": groups of three are thousands.
    eur = Number(text.replace(/[.,]/g, ""));
  } else if (/^\d+[.,]\d{1,2}$/.test(text)) {
    // „28500,50": cents. The advert carries whole euros.
    eur = Math.round(Number(text.replace(",", ".")));
  }

  if (eur === null || !Number.isFinite(eur)) {
    return { kind: "invalid", message: `„${input.trim()}“ не е цена. Въведете напр. 28500 или 28 500.` };
  }
  if (eur < MIN_MANUAL_PRICE_EUR) {
    return {
      kind: "invalid",
      message: `„${input.trim()}“ се чете като ${eur} €, а това е под ${MIN_MANUAL_PRICE_EUR} € и изглежда като грешка. Въведете напр. 28500 или 28 500.`,
    };
  }
  return { kind: "ok", eur };
}
