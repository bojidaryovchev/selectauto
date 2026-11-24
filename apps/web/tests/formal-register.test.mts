/**
 * The copy stays formal: „вие" everywhere (decision 1), the blog included (decision 20).
 *
 * Reads every user-facing string in src (JSX text and string and template literals, through the TypeScript compiler,
 * so comments don't count) and the blog's markdown in content/, and looks for informal address with the flags of the
 * design run's copy scan (the design-canvas Bulgarian formal pack, as the SelectAuto workspace uses it), after blanking
 * the same ignore words. A hit is allowed only inside a phrase on the ALLOWED list, which says why; an ALLOWED phrase
 * that no longer occurs fails too, so the list can't go stale.
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import ts from "typescript";

const ROOT = join(import.meta.dirname, "..");
const SOURCES = [join(ROOT, "src"), join(ROOT, "content")];

/** The flags, as the design run's copy scan has them. `cased` flags match case-sensitively. */
const FLAGS: { name: string; source: string; cased?: boolean }[] = [
  {
    name: "informal pronoun",
    source: "(?<![А-Яа-я])(ти|теб|твой|твоя|твое|твоите|твоят|си писал|си работил|си избрал)(?![А-Яа-я])",
  },
  { name: "informal verb (-ш)", source: "(?<![А-Яа-я])([А-Яа-я]{3,}ш)(?![А-Яа-я])" },
  { name: "informal greeting", source: "(?<![А-Яа-я])(Здравей|Добре дошъл|Добре дошла)(?![А-Яа-я])" },
  {
    name: "informal imperative, sentence start",
    cased: true,
    source:
      '(?:^|[.!?:;·•„"(]\\s*)(Опиши|Разкажи|Напиши|Пиши|Избери|Сподели|Виж|Добави|Поеми|Купи|Плати|Влез|Въведи|Смени|Покажи|Затвори|Отвори|Изпрати|Остави|Наеми|Прочети|Предложи|Направи|Запази|Поправи|Сравни|Продължи|Отмени|Изтегли|Изтрий|Задай|Подай|Пусни|Откажи|Отхвърли|Потвърди|Върни|Кажи|Свали|Задръж|Покани|Обнови|Промени|Премахни|Махни|Стани|Създай|Започни|Вземи|Обади|Провери|Отговори|Включи|Изключи|Разшири|Подреди|Изчисти|Скрий|Спри|Прикачи|Приближи|Отдалечи|Съкрати|Натисни|Погледни|Търси|Потърси)(?![А-Яа-я])',
  },
  {
    name: "informal imperative, anywhere",
    source:
      "(?<![А-Яа-я])(Разгледай|Поискай|Публикувай|Опитай|Презареди|Снимай|Чакай|Казвай|Сваляй|Пращай|Внимавай|Опиши|Разкажи|Напиши|Сравни|Покажи|Кажи|Махни|Купи|Влез|Въведи|Задай|Подай|Пусни)(?![А-Яа-я])",
  },
  {
    name: "informal phrase, anywhere",
    source:
      "(?<![А-Яа-я])(Свържи се|свържи се|Обади се|обади се|Регистрирай се|Абонирай се|Цитирай|цитирай|Копирай|копирай|Изчакай|Използвай|Опитай|опитай|Заяви|Първо избери|първо избери|Натисни|Попълни|ще получиш|можеш|търсиш|намираш|искаш|имаш|твоята|твоя|твоите|с теб|за теб)(?![А-Яа-я])",
  },
  {
    name: "informal adjective to the reader",
    source: "(?<![А-Яа-я])(Заинтересован|Сигурен ли си|Готов ли си)(?![А-Яа-я])",
  },
  // Not in the design run's pack: „ти си гледал" in any verb. The pack named three participles only, and „Ако си
  // гледал …, си попадал" in the Encar post got through decision 20 (fixed 24.11.2026). The plural „-ли" goes with the
  // formal „сте", and nouns in „-ли" („любимите си автомобили") would match it, so only -л, -ла, -ло count.
  { name: "informal perfect (си + participle)", source: "(?<![А-Яа-я])(си [а-я]+л[ао]?)(?![А-Яа-я])" },
];

/** Whole words blanked before matching: abbreviations, legal capitals and words that merely end in -ш. */
const IGNORE_WORDS = [
  "АВТОМОБИЛ", "АДС", "ВИН", "ВиК", "ГТП", "ДДС", "ДЖИП", "ЕАД", "ЕГН", "ЕИК", "ЕООД", "ЕС", "ИМПОРТ", "КАТ", "КЗЛД",
  "МВР", "НАП", "ОББ", "ООД", "ПУДООС", "САЩ", "СЕЛЕКТАУТО", "ШРУС", "бранш", "ваш", "душ", "кеш", "марш", "наш",
  "туш", "фиш",
]; // prettier-ignore

/** Phrases a flag may hit, with the reason. `whole`: only when the phrase is the entire string (a heading). */
const ALLOWED: { phrase: string; whole?: boolean; why: string }[] = [
  { phrase: "Купи сега", why: "the auctions' Buy Now price by its name, as Copart and the boards print it" },
  { phrase: "правото да бъдеш забравен", why: "the GDPR right's own name, in the privacy policy (decision 25)" },
  { phrase: "Отговори на най-честите въпроси", why: "„Отговори\" is the noun: answers to the most common questions" },
  { phrase: "Промени", whole: true, why: "a heading in the cookie policy: changes" },
  { phrase: "Промени в политиката", whole: true, why: "a heading in the privacy policy: changes to the policy" },
  { phrase: "докато не се попълни", why: "reflexive, in the admin: until it is filled in" },
  { phrase: "Търси конкретен модел", why: "third person, in the admin: the lead is looking for a specific model" },
];

type Segment = { file: string; line: number; text: string };

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return /\.(tsx?|md)$/.test(entry.name) ? [path] : [];
  });
}

function segmentsOf(file: string): Segment[] {
  const source = readFileSync(file, "utf8");
  const name = relative(ROOT, file).replaceAll("\\", "/");
  if (file.endsWith(".md")) return source.split("\n").map((text, i) => ({ file: name, line: i + 1, text }));
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Segment[] = [];
  const visit = (node: ts.Node) => {
    let text: string | null = null;
    if (ts.isJsxText(node)) text = node.getText();
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    if (text && /[А-Яа-я]/.test(text)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      out.push({ file: name, line, text: text.replace(/\s+/g, " ").trim() });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const segments = SOURCES.flatMap(filesUnder).flatMap(segmentsOf);
const ignore = new RegExp(`(?<![\\wА-Яа-яЁё])(${IGNORE_WORDS.join("|")})(?![\\wА-Яа-яЁё])`, "giu");
const flags = FLAGS.map((f) => ({ name: f.name, re: new RegExp(f.source, f.cased ? "gdu" : "gdiu") }));

/** Where the allowed phrases sit in a string, as [start, end) ranges. */
function allowedRanges(text: string): [number, number][] {
  return ALLOWED.flatMap(({ phrase, whole }) => {
    if (whole) return text === phrase ? [[0, text.length] as [number, number]] : [];
    const ranges: [number, number][] = [];
    for (let i = text.indexOf(phrase); i !== -1; i = text.indexOf(phrase, i + 1)) ranges.push([i, i + phrase.length]);
    return ranges;
  });
}

describe("the copy stays formal", () => {
  test("no informal address in the interface, the e-mails or the blog", () => {
    const hits: string[] = [];
    for (const { file, line, text } of segments) {
      // Blank the ignore words with spaces of the same length, so positions still line up with `text`.
      const probe = text.replace(ignore, (word) => " ".repeat(word.length));
      const allowed = allowedRanges(text);
      for (const { name, re } of flags) {
        for (const match of probe.matchAll(re)) {
          const [start, end] = match.indices?.[1] ?? [match.index, match.index + match[0].length];
          if (allowed.some(([a, b]) => start >= a && end <= b)) continue;
          hits.push(`${file}:${line} ${name}: «${text.slice(start, end)}» in „${text.slice(0, 120)}"`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  test("every allowed phrase still occurs", () => {
    const unused = ALLOWED.filter(({ phrase, whole }) =>
      segments.every(({ text }) => (whole ? text !== phrase : !text.includes(phrase))),
    ).map(({ phrase }) => phrase);
    assert.deepEqual(unused, []);
  });
});
