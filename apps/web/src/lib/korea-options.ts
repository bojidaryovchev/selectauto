import { KOREA_OPTION_BY_CODE, KOREA_OPTION_SECTIONS } from "@/data/korea-options";
import { koreaOptionNameBg, koreaSectionBg } from "@/lib/korea-labels";

/**
 * Resolves ENCAR factory-option CODES (stored in a lot's
 * `raw_json.details.options.standard[]`) into human-readable, section-grouped
 * labels via the baked `korea-options` dictionary. See `@/data/korea-options`
 * for why the catalog is baked rather than synced.
 *
 * Only `standard[]` (3-digit codes) decodes here; `choice[]` (4–5-digit codes) is a
 * different space and is intentionally ignored — its named/priced entries come from
 * `options_extra[]`, handled separately in the ENCAR detail mapper.
 */

/** One rendered section of standard equipment. */
export type KoreaOptionGroup = {
  /** BG section label ("Безопасност", "Седалки", …). */
  section: string;
  /** Decoded option names in that section, localized to BG. */
  names: string[];
};

/** English label for a single option code, or undefined when unknown. */
export function koreaOptionLabel(code: string | number | null | undefined): string | undefined {
  if (code == null) return undefined;
  return KOREA_OPTION_BY_CODE[String(code)]?.name;
}

/**
 * Groups a lot's `standard[]` option codes into rendered sections, in the catalog's
 * canonical section order (Exterior/Interior → Safety → Convenience/Multimedia →
 * Seats). Option names and section labels are localized to BG (see
 * `@/lib/korea-labels` — compositional Base (qualifier) atoms). Unknown codes
 * (≈9% — codes absent from the 62-row catalog) are dropped so the UI never shows a
 * raw number. Returns [] when nothing decodes.
 */
export function groupKoreaOptions(codes: unknown): KoreaOptionGroup[] {
  if (!Array.isArray(codes)) return [];
  // Group by English section name internally (stable key), localize on emit.
  const bySection = new Map<string, string[]>();
  for (const raw of codes) {
    const opt = KOREA_OPTION_BY_CODE[String(raw)];
    if (!opt) continue;
    const arr = bySection.get(opt.sectionName) ?? [];
    arr.push(koreaOptionNameBg(opt.name));
    bySection.set(opt.sectionName, arr);
  }
  // Emit sections in the dictionary's declared section order.
  const order = Object.values(KOREA_OPTION_SECTIONS);
  return order
    .filter((section) => bySection.has(section))
    .map((section) => ({ section: koreaSectionBg(section), names: bySection.get(section)! }));
}
