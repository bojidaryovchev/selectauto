/**
 * Bulgarian labels for the ENCAR dealer/priced extras (`details.options_extra[]`,
 * rendered under "Допълнителни пакети"). Unlike the standard catalog (see
 * `@/lib/korea-labels`), extras are a ~4.7k-value free-text long tail, so this is
 * NOT a full dictionary — it is a correctness-first resolver that only translates
 * where the Bulgarian is objectively unambiguous:
 *
 *   1. a curated whole-string map of safe, generic terms (sunroof family, common
 *      equipment, a few plainly-descriptive package names);
 *   2. mechanical patterns that carry no grammatical agreement risk — seat counts
 *      ("6 seats" → "6 места"), inch/navigation sizes, and paint colors with their
 *      OEM code ("white cream (wc9) exterior color" → "Кремаво бяло (WC9)").
 *
 * Everything else — brand/marketing names (Krell, Bang & Olufsen, Drive Wise,
 * Hyundai Smart Sense, UVO, TUIX…), trim-package tiers, and the long one-off
 * descriptive blobs — falls back to the ORIGINAL string verbatim. That is
 * deliberate: a Bulgarian buyer recognises those in their original form, and a
 * verbatim fallback can never render a wrong or ungrammatical translation.
 *
 * Adding an entry to the maps below is the safe way to grow coverage over time.
 */

/** Curated whole-string translations (key = lowercased, whitespace-collapsed). */
const EXTRA_BG: Record<string, string> = {
  // — sunroof family (люк is masculine; adjectives agree) —
  sunroof: "Люк",
  "panoramic sunroof": "Панорамен люк",
  "safety sunroof": "Обезопасен люк",
  "dual sunroof": "Двоен люк",
  "dual wide sunroof": "Двоен широк люк",
  "wide panoramic sunroof": "Широк панорамен люк",
  "wide sunroof": "Широк люк",
  "one-touch safety electric sunroof": "Електрически люк с едно докосване",
  "panoramic sunroof + led interior light": "Панорамен люк + LED осветление на купето",
  "wide panoramic sunroof (including led room lamp)": "Широк панорамен люк (с LED осветление на купето)",
  "dual sunroof (including led room lamp)": "Двоен люк (с LED осветление на купето)",

  // — common equipment (safe, unambiguous) —
  "head-up display": "Проекционен дисплей",
  "head-up display (hud)": "Проекционен дисплей (HUD)",
  "side & curtain airbags": "Странични и завесни въздушни възглавници",
  "driver's knee airbag": "Въздушна възглавница за коляното на шофьора",
  "3d around view monitoring system": "3D система за кръгов обзор",
  "built-in cam": "Вграден видеорегистратор",
  "built-in cam package": "Пакет с вграден видеорегистратор",
  "built-in cam (including auxiliary battery)": "Вграден видеорегистратор (с допълнителна батерия)",
  "auxiliary battery": "Допълнителна батерия",
  "parking assist": "Асистент за паркиране",
  "electric side steps": "Електрически странични стъпала",
  "fixed side steps": "Фиксирани странични стъпала",
  "smart power sliding door": "Автоматична плъзгаща се врата",
  "magic tailgate": "Електрически заден капак",
  "two tone roof": "Двуцветен покрив",
  "two-tone exterior package": "Двуцветен екстериор",
  "rear seat dual monitors": "Двойни монитори за задните седалки",
  "hid headlamp": "Фарове (HID)",

  // — equipment that is Tier-1 catalog vocabulary in a different word order,
  //   or plain generic equipment (all safe/unambiguous) —
  "curtain airbag": "Завесна въздушна възглавница",
  "side airbag": "Странична въздушна възглавница",
  "rear side airbag": "Задна странична въздушна възглавница",
  "multi-chamber air suspension": "Многокамерно пневматично окачване",
  "hi-pass system (ecm not applied)": "Hi-Pass (без ECM огледало)",
  "passenger seat airbag": "Въздушна възглавница (пътник)",
  "driver seat airbag": "Въздушна възглавница (шофьор)",
  "driver's seat airbag": "Въздушна възглавница (шофьор)",
  "ecm room mirror": "Автоматично затъмняващо се огледало",
  "electronically controlled suspension": "Електронно управляемо окачване",
  "preview electronically controlled suspension": "Електронно управляемо окачване (Preview)",
  "around view monitor": "Система за кръгов обзор",
  "around view monitoring system": "Система за кръгов обзор",
  "3d around view system": "3D система за кръгов обзор",
  "vehicle stability control (vdc)": "Система за стабилност (VDC)",
  "side step": "Странично стъпало",
  "side storage box": "Странична кутия за съхранение",
  "wireless charger": "Безжично зарядно",
  "cell phone wireless charger (15w)": "Безжично зарядно за телефон (15W)",
  "hi-pass system": "Hi-Pass",
  "hi-pass system (including ecm room mirror)": "Hi-Pass (с автоматично затъмняващо се огледало)",
  "hi-pass system + ecm room mirror": "Hi-Pass + автоматично затъмняващо се огледало",
  "hi-pass + ecm room mirror": "Hi-Pass + автоматично затъмняващо се огледало",
  "etcs + ecm room mirror": "ETCS + автоматично затъмняващо се огледало",
  "matte color": "Матов цвят",
  "window van": "Ван с прозорци",
  "twin swing door": "Двойна крилата врата",

  // — plainly-descriptive package / trim terms —
  comfort: "Комфорт",
  convenience: "Комфорт",
  style: "Стил",
  premium: "Премиум",
  "comfort package": "Пакет „Комфорт“",
  "convenience package": "Пакет „Комфорт“",
  "sports package": "Пакет „Спорт“",
  "2nd row comfort package": "Пакет „Комфорт“ (втори ред)",
  "rear seat comfort package": "Пакет „Комфорт“ (задни седалки)",
};

/**
 * Confident paint-color names (key = lowercased color name, without the OEM code
 * and without any "exterior color" suffix). Uncertain OEM marketing colors are
 * intentionally omitted so they fall back to the original string.
 */
const COLOR_BG: Record<string, string> = {
  "snow white pearl": "Снежнобял седеф",
  "creamy white pearl": "Кремаво-бял седеф",
  "white cream": "Кремаво бяло",
  "white pearl": "Бял седеф",
  "ice white": "Ледено бяло",
  "white crystal": "Кристално бяло",
  "flame red": "Огненочервено",
  "silky white pearl": "Копринено бял седеф",
};

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Paint-color matcher. Strips a trailing "(CODE)" and a trailing
 * "[exterior] color" suffix, looks the remaining color name up in `COLOR_BG`,
 * and reassembles as "<BG цвят> (CODE)". Returns null when the color is unknown.
 */
function matchColor(original: string): string | null {
  let s = original.replace(/\s*(?:exterior\s+)?color$/i, "").trim();
  let code = "";
  s = s
    .replace(/\s*\(([^)]+)\)\s*$/, (_m, c: string) => {
      code = c.trim();
      return "";
    })
    .trim();
  const bg = COLOR_BG[s.toLowerCase()];
  if (!bg) return null;
  return code ? `${bg} (${code.toUpperCase()})` : bg;
}

/**
 * Localizes one `options_extra[].name` to Bulgarian, or returns it verbatim when
 * no confident translation applies (see file header for the policy).
 */
export function encarExtraNameBg(name: string): string {
  const original = collapse(name);
  const key = original.toLowerCase();

  const curated = EXTRA_BG[key];
  if (curated) return curated;

  let m: RegExpMatchArray | null;
  if ((m = key.match(/^(\d+)\s+seats$/))) return `${m[1]} места`;
  if ((m = key.match(/^(\d+)-seater$/))) return `${m[1]}-местен`;
  if ((m = key.match(/^([\d.]+)[- ]inch navigation$/))) return `${m[1]}-инчова навигация`;
  if ((m = key.match(/^navigation \((\d+) inches?, rear camera\)$/)))
    return `Навигация (${m[1]} инча, задна камера)`;

  // "<known trim> (N seats)" → translate both halves (grammar-safe: both are
  // curated/mechanical). E.g. "comfort (9 seats)" → "Комфорт (9 места)".
  if ((m = key.match(/^(.+?)\s*\((\d+)\s+seats\)$/)) && EXTRA_BG[m[1]])
    return `${EXTRA_BG[m[1]]} (${m[2]} места)`;

  // "matte color (matte, choose from N types: <list>)" → wrapper translated, the
  // OEM shade names inside the list kept verbatim (they are proper marketing names).
  if ((m = key.match(/^matte color \(matte, choose from (\d+) types?: (.+)\)$/)))
    return `Матов цвят (мат, по избор от ${m[1]}: ${m[2]})`;

  const color = matchColor(original);
  if (color) return color;

  return original;
}
