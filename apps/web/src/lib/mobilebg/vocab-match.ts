/**
 * Pure name matching between our AuctionsAPI reference names and mobile.bg's
 * closed publishing vocabulary. No I/O and no imports, so it runs anywhere —
 * including under plain `node` to measure coverage against real data.
 *
 * ── Measured before designing (active catalog, 2026-09-10) ──────────────────
 *  - Brand: a normalised exact match alone resolves 95.2% of active cars. The
 *    real misses are a handful of renames (Volkswagen→VW, RAM→Dodge, Lucid→Lucid
 *    Air, Ineos→Ineos Grenadier); the rest are trucks and buses that do not belong
 *    under „Автомобили и Джипове" at all (International, Scania, IC, Tata Daewoo).
 *  - Model: a normalised exact match resolves 88.8% of cars across the top 30
 *    brands (Honda 97%, Toyota 98%). The misses are SYSTEMATIC:
 *      · BMW / Mercedes (44% / 21%) — mobile.bg files them by engine designation
 *        ("330", "E 350"), we by family ("3er", "E-klasse"). The designation is in
 *        our TITLE: "2021 BMW 330I", "E-Class W213 E350 4Matic".
 *      · AuctionsAPI's "X (Y)" names: "Navara (Frontier)", "Liberty (Patriot)".
 *      · RAM trucks, which mobile.bg files under Dodge as "RAM 1500".
 *
 * ── The rule every step obeys ───────────────────────────────────────────────
 * A match is accepted only when it lands on EXACTLY ONE entry of their live
 * list, from evidence the car itself carries (its model name or its title).
 * Nothing fuzzier is accepted here: "Encore GX" is not an "Encore", "Bronco
 * Sport" is not a "Bronco", and mobile.bg accepts a wrong model silently —
 * burying a paid advert. Those become a one-click admin choice instead. Every
 * result carries its provenance so the preview can show how it was decided.
 */

/**
 * Case-, diacritic- and punctuation-insensitive comparison key.
 *
 * Keeps Unicode LETTERS rather than just a–z: stripping non-ASCII collapses
 * mobile.bg's Cyrillic brands (Други, Победа, София, Чайка) to the same empty
 * key, which then "matches" any unnamed manufacturer. `&` reads as "and" because
 * our "Town & Country" is their "Town and Country".
 */
export function vocabKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Brand renames, each checked against mobile.bg's live brand list: the target
 * exists there and our spelling does not. Applied only when there is no exact
 * match, and only if the target is still in the list at resolution time.
 */
const BRAND_ALIASES: Record<string, string> = {
  volkswagen: "VW",
  // Their Dodge list carries "RAM 1500" / "RAM 2500" / "RAM 3500".
  ram: "Dodge",
  // Their only Lucid / Ineos entries are these model-named brands.
  lucid: "Lucid Air",
  ineos: "Ineos Grenadier",
};

export type BrandSource = "exact" | "alias";
export type BrandMatch = { marka: string; source: BrandSource };

export function matchBrand(ourBrand: string | null, markaList: string[]): BrandMatch | null {
  const key = vocabKey(ourBrand);
  if (!key) return null;

  const exact = markaList.filter((m) => vocabKey(m) === key);
  if (exact.length === 1) return { marka: exact[0], source: "exact" };
  if (exact.length > 1) return null;

  const alias = BRAND_ALIASES[key];
  if (alias && markaList.includes(alias)) return { marka: alias, source: "alias" };
  return null;
}

export type ModelSource = "exact" | "brand-prefixed" | "variant" | "title" | "family";
export type ModelMatch = { model: string; source: ModelSource; evidence: string };

/**
 * Resolve our model to one entry of `modelList` (mobile.bg's list for `marka`),
 * trying the strongest evidence first. Returns the list's OWN string — their
 * values carry quirks such as trailing spaces ("Leaf ") and must be sent verbatim.
 */
export function matchModel(args: {
  ourBrand: string | null;
  marka: string;
  ourModel: string | null;
  title: string | null;
  year: number | null;
  modelList: string[];
}): ModelMatch | null {
  const { ourBrand, marka, ourModel, title, year, modelList } = args;

  const index = new Map<string, string[]>();
  for (const m of modelList) {
    const k = vocabKey(m);
    if (k) index.set(k, [...(index.get(k) ?? []), m]);
  }
  const unique = (candidate: string | null | undefined): string | null => {
    const hits = index.get(vocabKey(candidate));
    return hits && hits.length === 1 ? hits[0] : null;
  };

  // 1. The same name ("Fit" = "Fit", "F-150" = "F150", "CR-V" = "Cr-v").
  const exact = unique(ourModel);
  if (exact) return { model: exact, source: "exact", evidence: ourModel ?? exact };

  // 2. Our brand is filed under a DIFFERENT mobile.bg brand, which spells the
  //    model with our brand in front: RAM "1500" → Dodge "RAM 1500".
  if (ourBrand && ourModel && vocabKey(ourBrand) !== vocabKey(marka)) {
    const prefixed = unique(`${ourBrand} ${ourModel}`);
    if (prefixed) {
      return { model: prefixed, source: "brand-prefixed", evidence: `${ourBrand} ${ourModel}` };
    }
  }

  const titleKey = vocabKey(title);

  // 3. "X (Y)" — either half may be the name mobile.bg uses, but the pairing is
  //    not always a pure alias, so a half is accepted only when the car's own
  //    title names it too ("Liberty (Patriot)" cars are titled "Jeep Patriot").
  const paren = /^(.*?)\s*\((.+)\)\s*$/.exec(ourModel ?? "");
  if (paren) {
    const accepted = new Set<string>();
    let evidence = "";
    for (const variant of [paren[1], paren[2]]) {
      const hit = unique(variant);
      const vk = vocabKey(variant);
      if (hit && vk.length >= 3 && titleKey.includes(vk)) {
        accepted.add(hit);
        evidence = variant;
      }
    }
    if (accepted.size === 1) return { model: [...accepted][0], source: "variant", evidence };
  }

  // 4. The engine designation from the title ("330I" → "330", "E350" → "E 350").
  const fromTitle = designationFromTitle(title, ourBrand, year, unique);
  if (fromTitle) return { model: fromTitle.model, source: "title", evidence: fromTitle.text };

  // 5. The family entry for German "X-klasse" names ("CLA-klasse" → "CLA"), used
  //    only after the title failed to give the more specific designation.
  const family = /^(.+?)[\s-]*(klasse|class)$/i.exec(ourModel ?? "");
  if (family) {
    const hit = unique(family[1]);
    if (hit) return { model: hit, source: "family", evidence: ourModel ?? hit };
  }

  return null;
}

/**
 * Find the one mobile.bg model the title's DIGIT-BEARING spans point at.
 *
 * Only spans containing a digit are considered: designations always do, while
 * plain words collide with unrelated models (Hyundai lists both "Genesis" and
 * "Coupe"). A span nested inside a longer matched span belongs to it — "300"
 * inside "C 300" — so only outermost matches count, and anything but exactly one
 * distinct model is treated as unresolved.
 */
function designationFromTitle(
  title: string | null,
  ourBrand: string | null,
  year: number | null,
  unique: (candidate: string) => string | null,
): { model: string; text: string } | null {
  const brandKey = vocabKey(ourBrand);
  const yearKey = year ? String(year) : "";
  const tokens = (title ?? "").split(/\s+/).filter((t) => {
    const k = vocabKey(t);
    return k !== "" && k !== yearKey && k !== brandKey;
  });

  type Hit = { model: string; start: number; end: number; text: string };
  const hits: Hit[] = [];

  for (let n = 3; n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const span = tokens.slice(i, i + n);
      if (!span.some((t) => /\d/.test(t))) continue;
      const text = span.join(" ");
      let model = unique(text);
      // BMW writes the trim letters onto the number ("330I", "535 Igt" is split
      // already); mobile.bg lists the bare number, so try it without them.
      if (!model && n === 1) {
        const bare = /^(\d{3})[a-z]{1,3}$/.exec(vocabKey(text));
        if (bare) model = unique(bare[1]);
      }
      if (model) hits.push({ model, start: i, end: i + n, text });
    }
  }

  const outer = hits.filter(
    (h) =>
      !hits.some(
        (o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start,
      ),
  );
  const models = [...new Set(outer.map((h) => h.model))];
  if (models.length !== 1) return null;

  const first = outer.find((h) => h.model === models[0]);
  return first ? { model: first.model, text: first.text } : null;
}
