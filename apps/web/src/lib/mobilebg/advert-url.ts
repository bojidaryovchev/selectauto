/**
 * Public links to mobile.bg. Client-safe (no server-only imports) so the admin
 * components can use them.
 */

/**
 * The public page of one advert.
 *
 * mobile.bg's canonical URL carries a slug built from the advert's own title
 * („/obiava-11789725207278442-honda-civic-1-8l-i-4-vvt-regular-140hp"), and the
 * import API never returns it: `advertload` gives every field EXCEPT the link.
 * The id alone is enough, though. Checked 2026-09-18: `/obiava-<ida>` with no
 * slug, and with a deliberately wrong slug, both 302 to the canonical page (the
 * legacy `pcgi/mobile.cgi?act=4&adv=<ida>` 301s there too).
 */
export function advertUrl(ida: string): string {
  return `https://www.mobile.bg/obiava-${ida}`;
}
