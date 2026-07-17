/**
 * Bulgarian labels for the ENCAR vehicle-history timeline (`details.history[]`,
 * rendered by `CarHistoryTimeline` as "История на автомобила"). Covers the three
 * fields that were previously passed through in English — `date`, `title`, `sub`
 * — while the coloured `flag` pill is localized separately by `historyFlagLabel`
 * in `@/lib/car-labels`.
 *
 * A DB analysis of 181k lots (2.4M content rows) showed these fields are far more
 * finite than they look:
 *   • date  → "<English month> <year>" — just 12 month names + a number.
 *   • title → 124 distinct = ~12 core event types (93.7%) + ~93
 *             "[<part>] included in recall" templates (8.9%).
 *   • sub   → 545k RAW values but only ~2.2k templates once the embedded numbers
 *             are normalized; the top 200 templates cover 91% and are built from a
 *             small vocabulary of transaction / inspection / measure / note phrases
 *             plus a Korean place name and a number.
 *
 * So `date`/`title` get full finite dictionaries, and `sub` gets an ordered
 * phrase-replacement resolver (translate the recognised phrases, keep the numbers,
 * and leave Korean place names verbatim — they are proper nouns, kept like brand
 * names elsewhere). Anything unrecognised falls back to its original text.
 */

/** English month name (lowercase) → BG. Used by both the date and the sub resolver. */
const MONTH_BG: Record<string, string> = {
  january: "Януари",
  february: "Февруари",
  march: "Март",
  april: "Април",
  may: "Май",
  june: "Юни",
  july: "Юли",
  august: "Август",
  september: "Септември",
  october: "Октомври",
  november: "Ноември",
  december: "Декември",
};

/** history[].date "MAY 16" → "Май 16" (translate month word(s), keep the year). */
export function historyDateBg(date: string): string {
  if (!date) return date;
  return date.replace(/[a-z]+/gi, (w) => MONTH_BG[w.toLowerCase()] ?? w);
}

/** Core event-type titles (lowercased key). Covers ~97% of title occurrences. */
const TITLE_BG: Record<string, string> = {
  "car inspection completed": "Извършен технически преглед",
  "automobile inspection completed": "Извършен технически преглед",
  "owner change": "Смяна на собственик",
  ownership: "Прехвърляне на собственост",
  "maintenance/repair history": "История на поддръжка/ремонт",
  "change registration": "Смяна на регистрация",
  "insurance processing after damage to my car": "Застрахователно събитие (щета по автомобила)",
  "insurance processing after my car damage": "Застрахователно събитие (щета по автомобила)",
  "no car insurance": "Без застрахователно събитие",
  "insurance processing after damage caused by another car": "Застрахователно събитие (щета от друг автомобил)",
  "insurance processing after damage caused by another vehicle": "Застрахователно събитие (щета от друго МПС)",
  "new car delivery (in personal name)": "Доставка на нов автомобил (частно лице)",
  "new car delivery (corporate name)": "Доставка на нов автомобил (юридическо лице)",
  "new car delivery (in business name)": "Доставка на нов автомобил (юридическо лице)",
  "enka comparative quote reception history": "Encar: получена сравнителна оферта",
};

/** Common recall part-categories (the "[<part>] included in recall" titles). */
const RECALL_CATEGORY_BG: Record<string, string> = {
  "prime mover (engine)": "Двигател",
  "prime mover (power generation device)": "Двигател (ел. генератор)",
  "electrical equipment and other": "Електрообзавеждане и др.",
  "electrical device": "Електрическо устройство",
  "brake system and other": "Спирачна система и др.",
  "brake device": "Спирачно устройство",
  "riding and indoor equipment": "Купе и интериор",
  "ride and indoor equipment": "Купе и интериор",
  "power transmission device and others": "Трансмисия и др.",
  "power transmission device": "Трансмисия",
  "fuel device and other": "Горивна система и др.",
  "fuel device": "Горивна система",
  "cooling/heating equipment and other": "Охлаждане/отопление и др.",
  "cooling/heating device": "Охлаждане/отопление",
  "indoor safety devices and other": "Обезопасяване в купето и др.",
  "chassis (frame)/body": "Шаси (рама)/каросерия",
  "car body/chassis etc.": "Каросерия/шаси и др.",
  "other devices and other": "Други устройства и др.",
  "other devices": "Други устройства",
  "steering device and other": "Кормилна система и др.",
  "steering device": "Кормилна система",
  "exhaust device": "Изпускателна система",
  "suction/supercharging device": "Всмукване/пълнене",
  "lighting device and other": "Осветление и др.",
  "lighting device": "Осветление",
  "seat belt and other": "Обезопасителни колани и др.",
  "seat belt, etc.": "Обезопасителни колани и др.",
  "no information": "Няма информация",
  abs: "ABS",
  airbag: "Въздушна възглавница",
  "automatic transmission": "Автоматична скоростна кутия",
  "clock securing device, etc.": "Заключващо устройство и др.",
  "clock securing device": "Заключващо устройство",
  "driving device and other": "Ходова част и др.",
  "driving device": "Ходова част",
  "buffer device": "Окачване (амортисьори)",
  "shock absorber and other": "Амортисьори и др.",
  "window glass etc.": "Стъкла и др.",
  "parking brake system": "Паркинг спирачка",
  "pedal/lever (braking device)": "Педал/лост (спирачка)",
  "various operation switches": "Различни превключватели",
  "brake control unit (ecu)": "Управление на спирачките (ECU)",
  "engine control unit (ecu)": "Управление на двигателя (ECU)",
  "instrument panel": "Табло/арматура",
  headlight: "Фарове",
  "brake hose": "Спирачен маркуч",
  "hydraulic system": "Хидравлична система",
  "fuel pipe": "Горивопровод",
  "fuel filter": "Горивен филтър",
  "fuel pump and filter": "Горивна помпа и филтър",
  battery: "Акумулатор",
  "cooling device (power generation facility)": "Охлаждане (генератор)",
  "wiper-related devices": "Чистачки",
  "engine body mechanical": "Двигател (механична част)",
  "number light": "Осветление на регистрационния номер",
  "seat device": "Седалки",
};

/**
 * history[].content[].title → BG. Core event types via `TITLE_BG`; the
 * "[<part>] included in recall" family via `RECALL_CATEGORY_BG` (unknown parts keep
 * their bracketed English). Unknown titles fall back to the original text.
 */
export function historyTitleBg(title: string): string {
  if (!title) return title;
  const key = title.trim().replace(/\s+/g, " ").toLowerCase();
  if (TITLE_BG[key]) return TITLE_BG[key];
  if (/included in recall/i.test(title)) {
    const cat = title
      .replace(/included in recall/i, "")
      .replace(/[[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const catBg = RECALL_CATEGORY_BG[cat.toLowerCase()] ?? cat;
    return `[${catBg}] — включено в отзоваване`;
  }
  return title;
}

/**
 * Ordered phrase replacements for `sub`. Case-insensitive; more specific phrases
 * MUST precede the general ones (e.g. the "(administrative district reorganization)"
 * variant before plain "change registration"). `$1` keeps the original number.
 */
const SUB_RULES: [RegExp, string][] = [
  // — measures (carry a number) —
  [/\bmileage\s+([\d,.]+)\s*km/gi, "Пробег $1 км"],
  [/\bdriving distance:?\s+([\d,.]+)\s*km/gi, "Пробег $1 км"],
  [/\bnew car factory price\s+([\d,.]+)\s*million won/gi, "Фабрична цена (нов): $1 млн. вон"],
  [/\bnew car delivery price\s+([\d,.]+)\s*million won/gi, "Цена при доставка (нов): $1 млн. вон"],
  [/\bnew car delivery price\s*-?/gi, "Цена при доставка (нов): —"],
  [/\btotal\s+([\d,.]+)\s*million won/gi, "Общо $1 млн. вон"],
  [/\btotal\s+([\d,.]+)\s*won/gi, "Общо $1 вон"],
  // — transaction / registration events —
  [/\btrader transaction transfer\b/gi, "Прехвърляне на сделка (търговец)"],
  [/\btransfer of transaction between parties\b/gi, "Прехвърляне на сделка между страни"],
  [/\btransfer of inheritance\b/gi, "Прехвърляне по наследство"],
  [/\bchange registration \(administrative district reorganization\)/gi, "Смяна на регистрация (адм. преустройство)"],
  [/\bchange registration \(moving in\)/gi, "Смяна на регистрация (преместване)"],
  [/\bchange registration \(simple transfer\)/gi, "Смяна на регистрация (прехвърляне)"],
  [/\bchange registration \(transfer and transfer\)/gi, "Смяна на регистрация (прехвърляне)"],
  [/\bchange registration\b/gi, "Смяна на регистрация"],
  [/\binstallation inspection\b/gi, "Първоначален преглед"],
  // — inspections (specific → general) —
  [/\b(\d+)(?:st|nd|rd|th)? member inspection \(comprehensive\)/gi, "$1-и преглед (пълен)"],
  [/\b(\d+)-part inspection \(comprehensive\)/gi, "$1-и преглед (пълен)"],
  [/\bre-inspection \((\d+)(?:st|nd|rd|th)? re-inspection\)/gi, "Повторен преглед ($1-и)"],
  [/\bcomprehensive inspection \(progress\)/gi, "Пълен преглед (в ход)"],
  [/\bcomprehensive \(emission exemption\)/gi, "Пълен преглед (без емисии)"],
  [/\bcomprehensive inspection\b/gi, "Пълен преглед"],
  [/\bregular \(progressive\) inspection\b/gi, "Редовен преглед (в ход)"],
  [/\bregular inspection\b/gi, "Редовен технически преглед"],
  // — notes —
  [/\bno new car shipping price information\b/gi, "Няма данни за цена на нов автомобил"],
  [/\btreatment of non-repairs\b/gi, "Без извършен ремонт"],
  [/\bnon-subscription period:/gi, "Период без застраховка:"],
  [/\bno information\b/gi, "Няма информация"],
  // date-range separator inside "non-subscription period: <month> <year> to <month> <year>"
  [/(\d{4})\s+to\s+(?=[a-z])/gi, "$1 – "],
  // — recall (mirrors the flag vocabulary) —
  [/\brecall completed\b/gi, "Отзоваване (изпълнено)"],
  [/\brecall required\b/gi, "Отзоваване (необходимо)"],
];

/**
 * history[].content[].sub → BG. Applies the phrase rules, then translates any
 * remaining English month names (the "non-subscription period: <month> ~ <month>"
 * form). Korean place names and numbers are left as-is. Unrecognised phrases pass
 * through in English.
 */
export function historySubBg(sub: string): string {
  if (!sub) return sub;
  let s = sub;
  for (const [re, rep] of SUB_RULES) s = s.replace(re, rep);
  s = s.replace(/[a-z]+/gi, (w) => MONTH_BG[w.toLowerCase()] ?? w);
  return s;
}
