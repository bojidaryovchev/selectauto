import { MAKE_LOGOS, MAKES_WITHOUT_LOGO } from "@/data/make-logos";

/**
 * A make's logo URL (decision 8: car makes always show their logo): the site's own file from `data/make-logos.ts`,
 * none for a make listed there without one, and otherwise AuctionsAPI's link from `manufacturers.image_url` (a make
 * added after the set was made). A plate shows the make's two letters when there is no logo or it fails to load.
 */
export function makeLogo(makeId: number | null | undefined, vendorUrl?: string | null): string | null {
  if (makeId != null) {
    const file = MAKE_LOGOS[makeId];
    if (file) return `/brand-logos/${file}`;
    if (Object.hasOwn(MAKES_WITHOUT_LOGO, makeId)) return null;
  }
  return vendorUrl || null;
}
