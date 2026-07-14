/**
 * Upstream title hygiene. Some AuctionsAPI titles arrive with their leading
 * year/make/model block duplicated — observed on IAAI lots co-listed from
 * Ritchie Bros (heavy trucks), e.g.:
 *
 *   "2026 Freightliner Cascadia 126 2026 Freightliner Cascadia 126 6X4 T/A Sleeper Truck Tractor"
 *   "2001 International 2001 International 6X4 T/A Day Cab Truck Tractor"
 *
 * (~0.5% of iaai_com listings in a 50k-row sample; 0 on Copart/Encar.) The
 * projection stores the upstream title verbatim, so the collapse happens here at
 * the display layer — used by BOTH the card mapper (`car-mapper.ts`) and the
 * detail mapper (`car-detail-mapper.ts`), so cards, <h1>, <title> metadata and
 * JSON-LD all agree.
 */

/**
 * Collapse a duplicated LEADING token block: when the title starts with the same
 * ≥2-token sequence twice in a row (case-insensitive), drop the first copy.
 * Longest block wins ("2026 Freightliner Cascadia 126" over a shorter accidental
 * match); titles without a leading duplicate pass through untouched.
 */
export function collapseLeadingDuplicate(title: string): string {
  const tokens = title.split(/\s+/).filter(Boolean);
  for (let len = Math.floor(tokens.length / 2); len >= 2; len--) {
    let same = true;
    for (let i = 0; i < len; i++) {
      if (tokens[i].toLowerCase() !== tokens[len + i].toLowerCase()) {
        same = false;
        break;
      }
    }
    if (same) return tokens.slice(len).join(" ");
  }
  return title;
}
