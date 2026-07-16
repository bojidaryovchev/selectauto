import type { DetectedCar } from "./types";

/**
 * Identify the auction lot on the current page from its URL/host, returning the
 * source + on-page lot id, or null when the page isn't a recognised lot detail
 * page. Ported from the legacy extension's `detectCarPage` (extractors.js),
 * typed and trimmed. IAAI Canada MUST be checked before IAAI US because
 * `ca.iaai.com` also matches `iaai.com`.
 *
 * The extracted `externalId` is the value the backend keys on as
 * `auction_lots.lot_number` (verified against live Neon for all three sources).
 */
export function detectCarPage(): DetectedCar | null {
  const url = window.location.href;
  const host = window.location.hostname;

  // COPART — /lot/{lotNumber}
  if (host.includes("copart.com") && url.includes("/lot/")) {
    const m = url.match(/\/lot\/(\d+)/i);
    return m ? { source: "copart", externalId: m[1]!, url } : null;
  }

  // IAAI CANADA (must precede IAAI US). Match ANY /vehicle-detail(s)/{id} or
  // ?itemid= — the id can be numeric ("46127174~US") or a Canada import token
  // ("Imp_3048024~CA"). The captured id is NOT the DB key (the stock number is,
  // read from the page); it only marks the page + serves as a dedup key.
  if (host.includes("ca.iaai.com") || host.includes("iaai.ca")) {
    const m = url.match(/\/vehicle-?details?\/([^/?#]+)/i) || url.match(/[?&]itemid=([^&#]+)/i);
    return m ? { source: "iaai_ca", externalId: decodeURIComponent(m[1]!), url } : null;
  }

  // IAAI US — same broadened matching.
  if (host.includes("iaai.com")) {
    const m = url.match(/\/vehicle-?details?\/([^/?#]+)/i) || url.match(/[?&]itemid=([^&#]+)/i);
    return m ? { source: "iaai", externalId: decodeURIComponent(m[1]!), url } : null;
  }

  // ENCAR — /cars/detail/{carId} or ?carid=
  if (host.includes("encar.com")) {
    const m = url.match(/\/cars\/detail\/(\d+)/i) || url.match(/[?&]carid=(\d+)/i);
    return m ? { source: "encar", externalId: m[1]!, url } : null;
  }

  return null;
}
