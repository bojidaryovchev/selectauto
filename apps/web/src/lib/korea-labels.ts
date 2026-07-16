/**
 * Bulgarian display labels for the ENCAR factory-option catalog (see
 * `@/data/korea-options`), built COMPOSITIONALLY rather than as one entry per
 * full string.
 *
 * The catalog names follow a `Base (qualifier)` shape — e.g. "Electric seat
 * (driver's seat)", "Airbag (side)", "Parking sensor (front)". The qualifier
 * repeats across many bases (driver's/passenger seat, front/rear, the ABS/LED/…
 * acronyms), so we translate each ATOM once and reassemble as
 * `BaseBG (qualifierBG)`. Translating 51 bases + a handful of qualifiers covers
 * all 62 catalog strings, and any future catalog row that reuses an existing
 * base/qualifier is localized for free.
 *
 * Grammar note: Bulgarian adjectives agree with the noun's gender/number, so
 * atoms are only safe to compose when the qualifier sits apart as an appositive
 * (the parenthetical) and is a noun / adverb / acronym — which is the case here
 * (шофьор, отпред, отзад, ABS…). The two adjectival qualifiers (странична,
 * стандартен/адаптивен) each pair with exactly one base, so agreement holds.
 *
 * Fallbacks are lossless: an unknown base returns the original English name, an
 * unknown qualifier keeps its original text — so nothing ever renders blank.
 */

/** Section code label (English) → BG. Keyed by the `sectionName` in the catalog. */
const SECTION_BG: Record<string, string> = {
  "exterior/interior": "Екстериор/Интериор",
  safety: "Безопасност",
  "convenience/multimedia": "Комфорт/Мултимедия",
  seats: "Седалки",
};

/** Base term (text before the parenthetical, lowercased) → BG. 51 atoms. */
const BASE_BG: Record<string, string> = {
  sunroof: "Люк",
  headlamp: "Фарове",
  "power electric trunk": "Електрически багажник",
  "ghost door closing": "Плавно затваряне на вратите",
  "electric folding side mirror": "Електрически сгъваеми огледала",
  "aluminum wheel": "Алуминиеви джанти",
  "roof rack": "Багажник за покрив",
  "heated steering wheel": "Подгряван волан",
  "power adjustable steering wheel": "Електрически регулируем волан",
  "paddle shift": "Лостчета за смяна на предавките",
  "steering wheel remote control": "Управление от волана",
  "ecm room mirror": "Автоматично затъмняващо се огледало",
  "hi pass": "Hi-Pass",
  "power door lock": "Централно заключване",
  "power steering wheel": "Сервоуправление",
  "power windows": "Електрически стъкла",
  airbag: "Въздушна възглавница",
  "anti-lock brakes": "Спирачки против блокиране",
  "non-slip": "Система против пробуксуване",
  "stability control system": "Система за стабилизиране",
  "tire pressure sensor": "Датчик за налягане в гумите",
  "lane departure warning system": "Предупреждение за напускане на лентата",
  "electronically controlled suspension": "Електронно управляемо окачване",
  "parking sensor": "Датчици за паркиране",
  "rear traffic warning system": "Предупреждение за напречен трафик отзад",
  "rear camera": "Задна камера",
  "360 degree around view": "Камера 360°",
  "cruise control": "Круиз контрол",
  "head-up display": "Проекционен дисплей",
  "electronic parking brake": "Електронна ръчна спирачка",
  "automatic air conditioner": "Автоматичен климатик",
  "smart key": "Смарт ключ",
  "wireless door lock": "Безжично заключване",
  "rain sensor": "Датчик за дъжд",
  "auto light": "Автоматични светлини",
  "curtain/blind": "Перде/Щора",
  "curtains/blinds": "Пердета/Щори",
  navigation: "Навигация",
  "front seat av monitor": "AV монитор отпред",
  "rear seat av monitor": "AV монитор отзад",
  bluetooth: "Bluetooth",
  "cd player": "CD плейър",
  "usb terminal": "USB порт",
  "aux terminal": "AUX порт",
  "leather seat": "Кожени седалки",
  "electric seat": "Електрическа седалка",
  "heated seats": "Подгряващи седалки",
  "memory seat": "Седалка с памет",
  "ventilated seat": "Вентилирана седалка",
  "ventilated seats": "Вентилирани седалки",
  "massage sheet": "Масажираща седалка",
};

/**
 * Qualifier (text inside the parenthetical, lowercased) → BG. Acronyms (ABS,
 * HID, LED, TCS, ESC, TPMS, LDWS, ECS, HUD, EPB) are intentionally absent — the
 * fallback keeps them verbatim.
 */
const QUALIFIER_BG: Record<string, string> = {
  "driver's seat": "шофьор",
  "passenger seat": "пътник",
  "rear seat": "отзад",
  "front seats": "отпред",
  "rear seats": "отзад",
  front: "отпред",
  rear: "отзад",
  side: "странична",
  curtain: "завеса",
  normal: "стандартен",
  adaptive: "адаптивен",
};

const PAREN = /\s*\(([^)]*)\)/g;

/** English section label → BG (falls back to the original text). */
export function koreaSectionBg(section: string): string {
  return SECTION_BG[section.toLowerCase()] ?? section;
}

/**
 * Compositional BG label for one catalog option name. Splits `Base (qualifier)`,
 * translates each atom, and reassembles as `BaseBG (qualifierBG)`. Returns the
 * original English name unchanged when the base is unknown (lossless fallback).
 */
export function koreaOptionNameBg(name: string): string {
  const quals: string[] = [];
  const base = name
    .replace(PAREN, (_m, q: string) => {
      quals.push(q.trim());
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();

  const baseBg = BASE_BG[base.toLowerCase()];
  if (!baseBg) return name;
  if (quals.length === 0) return baseBg;

  const qualsBg = quals.map((q) => QUALIFIER_BG[q.toLowerCase()] ?? q);
  return `${baseBg} (${qualsBg.join(", ")})`;
}
