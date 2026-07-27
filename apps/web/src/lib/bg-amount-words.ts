/**
 * Bulgarian numerals in words — for the contract templates ("14 196
 * (четиринадесет хиляди сто деветдесет и шест) евро") and the spec's §3.6
 * requirement that the total is printed with digits AND words.
 *
 * The rules encoded here were derived from SELECTAUTO's own signed contracts
 * (2026-058, 2026-086, 2026-090) and the deposit template 2026-047, and the
 * output is verified against every amount that appears in them:
 *
 *  - „и" joins only the LAST component: 20 150 → „двадесет хиляди сто и
 *    петдесет"; 1 200 → „хиляда и двеста"; 14 196 → „четиринадесет хиляди сто
 *    деветдесет и шест".
 *  - 1 000 is „хиляда" (never „една хиляда"); 2 000+ is „N хиляди".
 *  - Gender follows the currency noun: долар is masculine („седемдесет и два
 *    долара" — 2026-090), евро takes the neuter form („осемдесет и две" —
 *    2026-058).
 *  - The thousands multiplier uses the neuter form, matching the wording in
 *    2026-058: „двадесет и едно хиляди" (strict grammar would be „една
 *    хиляди", but these are the client's legal texts and they read „едно").
 */

const ONES_NEUTER = [
  "нула",
  "едно",
  "две",
  "три",
  "четири",
  "пет",
  "шест",
  "седем",
  "осем",
  "девет",
  "десет",
  "единадесет",
  "дванадесет",
  "тринадесет",
  "четиринадесет",
  "петнадесет",
  "шестнадесет",
  "седемнадесет",
  "осемнадесет",
  "деветнадесет",
];

/** Only 1 and 2 inflect; the rest are invariable. */
const ONES_MASCULINE = { 1: "един", 2: "два" } as const;

const TENS = ["", "", "двадесет", "тридесет", "четиридесет", "петдесет", "шестдесет", "седемдесет", "осемдесет", "деветдесет"];

const HUNDREDS = [
  "",
  "сто",
  "двеста",
  "триста",
  "четиристотин",
  "петстотин",
  "шестстотин",
  "седемстотин",
  "осемстотин",
  "деветстотин",
];

/** Grammatical gender of the counted noun. */
export type BgGender = "masculine" | "neuter";

/**
 * Splits a number below 1000 into its spoken components (hundreds, tens, ones
 * or a single teen), so the caller can apply the „и"-before-the-last rule.
 */
function componentsBelowThousand(n: number, gender: BgGender): string[] {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) parts.push(HUNDREDS[hundreds]!);

  if (rest === 0) return parts;

  if (rest < 20) {
    parts.push(gender === "masculine" && (rest === 1 || rest === 2) ? ONES_MASCULINE[rest] : ONES_NEUTER[rest]!);
    return parts;
  }

  const tens = Math.floor(rest / 10);
  const ones = rest % 10;
  parts.push(TENS[tens]!);
  if (ones > 0) {
    parts.push(gender === "masculine" && (ones === 1 || ones === 2) ? ONES_MASCULINE[ones] : ONES_NEUTER[ones]!);
  }
  return parts;
}

/** Joins components with the last one preceded by „и". */
function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(" ")} и ${parts.at(-1)}`;
}

/**
 * A whole number in Bulgarian words, e.g. 20150 → „двадесет хиляди сто и
 * петдесет". Supports 0 … 999 999 (contract sums never approach the ceiling).
 */
export function numberToBgWords(value: number, gender: BgGender = "neuter"): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return ONES_NEUTER[0]!;
  if (n >= 1_000_000) throw new RangeError("numberToBgWords supports values below 1 000 000");

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];

  if (thousands === 1) {
    parts.push("хиляда");
  } else if (thousands > 1) {
    // The multiplier itself is spoken in the neuter form („двадесет и едно
    // хиляди"), and it is one component for the „и" rule.
    parts.push(`${joinWithAnd(componentsBelowThousand(thousands, "neuter"))} хиляди`);
  }

  parts.push(...componentsBelowThousand(rest, gender));
  return joinWithAnd(parts);
}

/** BG names of the currencies used in the contracts, singular + plural. */
const CURRENCY_WORDS: Record<string, { one: string; many: string; gender: BgGender; fraction: string }> = {
  EUR: { one: "евро", many: "евро", gender: "neuter", fraction: "евроцента" },
  USD: { one: "долар", many: "долара", gender: "masculine", fraction: "цента" },
  BGN: { one: "лев", many: "лева", gender: "masculine", fraction: "стотинки" },
  CAD: { one: "канадски долар", many: "канадски долара", gender: "masculine", fraction: "цента" },
};

/**
 * An amount (in integer cents) written out with its currency, as the contracts
 * print it: „двадесет хиляди сто и петдесет евро". A non-zero fractional part
 * is appended in digits — „… евро и 54 евроцента" — which is how mixed sums are
 * normally written on Bulgarian payment documents.
 */
export function amountToBgWords(cents: number, currency: string): string {
  const meta = CURRENCY_WORDS[currency.toUpperCase()] ?? {
    one: currency,
    many: currency,
    gender: "neuter" as BgGender,
    fraction: "",
  };
  const whole = Math.floor(Math.abs(cents) / 100);
  const frac = Math.abs(cents) % 100;

  const words = `${numberToBgWords(whole, meta.gender)} ${whole === 1 ? meta.one : meta.many}`;
  if (frac === 0) return words;
  return `${words} и ${frac} ${meta.fraction}`.trim();
}
