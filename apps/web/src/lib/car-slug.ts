/**
 * Slugify brand/model names for the make/model SEO hub URLs
 * (`/avtomobili/marka/{make}/{model}/`). See docs/12-web-seo-strategy.md §4.1: hubs use
 * transliterated Latin slugs (the field norm), NOT the integer external ids the
 * catalog filter bar uses internally (`?brand=477&model=1203`). A hub's SEO value
 * IS the clean, keyword-rich URL, so we derive a slug from the display name.
 *
 * There is deliberately NO slug COLUMN in the DB (`manufacturers`/`vehicle_models`
 * carry only `external_id` + `name`). Slugs are derived on the fly from `name` and
 * resolved back to ids by slugging every candidate and matching — see
 * `queries/cars/get-car-hub.query.ts`. That keeps a single source of truth (the
 * synced reference name) and avoids a denormalized slug going stale when Flow 4
 * renames a make/model without touching lots (same reasoning the facets query
 * gives for not denormalizing names — see get-car-facets.query.ts).
 *
 * The transliteration table covers Cyrillic because a few reference names arrive
 * Cyrillic-cased from upstream; the vast majority of makes/models are already
 * Latin (BMW, Hyundai, Santa Fe) and pass through the ASCII-fold + kebab path.
 */

/** Bulgarian/Russian Cyrillic → Latin (BGN/PCGN-ish, lowercased). */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht",
  ъ: "a", ь: "y", ю: "yu", я: "ya", ы: "y", э: "e", ё: "yo",
};

/**
 * Turn a make/model display name into a URL slug: transliterate Cyrillic, strip
 * diacritics, lowercase, and collapse every run of non-alphanumeric characters to
 * a single hyphen. Deterministic and idempotent — `slugify(slugify(x)) === slugify(x)`.
 *
 * Examples: "BMW" → "bmw", "Santa Fe" → "santa-fe", "Mercedes-Benz" → "mercedes-benz",
 * "Škoda" → "skoda", "3 Series" → "3-series". Returns "" for a name that has no
 * slug-able characters (caller treats "" as unresolvable).
 */
export function slugify(name: string): string {
  const transliterated = Array.from(name.toLowerCase())
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");

  return transliterated
    // Decompose accented Latin (é → e +  ́) then drop the combining marks.
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    // Everything that isn't a-z/0-9 becomes a hyphen boundary.
    .replace(/[^a-z0-9]+/g, "-")
    // Trim leading/trailing hyphens.
    .replace(/^-+|-+$/g, "");
}

/**
 * The canonical model-hub path for a brand+model NAME pair, or null when either
 * name is missing or slugs to "" (no valid URL — the hub page wouldn't resolve it
 * either). Single source of truth for the URL shape, shared by the hub page's
 * self-canonical, the hub sitemap, and the internal links that point INTO hubs
 * (e.g. the car-detail breadcrumb) — so every producer of a hub URL agrees.
 */
export function modelHubPath(brandName: string | null | undefined, modelName: string | null | undefined): string | null {
  if (!brandName || !modelName) return null;
  const make = slugify(brandName);
  const model = slugify(modelName);
  if (!make || !model) return null;
  return `/avtomobili/marka/${make}/${model}`;
}

/**
 * The canonical brand-hub path for a make NAME (`/avtomobili/marka/{make}`), or
 * null when the name is missing or slugs to "". The tier above `modelHubPath`;
 * shared by the brand hub's self-canonical, the brand-hub sitemap entries, and the
 * up-links into it (model hub → brand hub).
 */
export function brandHubPath(brandName: string | null | undefined): string | null {
  if (!brandName) return null;
  const make = slugify(brandName);
  return make ? `/avtomobili/marka/${make}` : null;
}
