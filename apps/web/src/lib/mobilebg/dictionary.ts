import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * mobile.bg's publishing VOCABULARY — the allowed values for every `list`-typed
 * field of „Автомобили и Джипове" (topmenu=1) / „Главна рубрика" (rub=1).
 *
 * Two things make this worth a module of its own:
 *
 *  1. **It is public.** `/catfields` and `/dictionary` need no token, so the
 *     whole mapping and preview layer is buildable and testable before the
 *     import account is authorised — which is exactly the situation we are in.
 *
 *  2. **It is the only authority on what may be sent.** A `list` field rejects
 *     (or worse, silently mis-files) anything outside its list, and the values
 *     ARE the Bulgarian display strings — `marka=VW`, `color=Сребърен`. The
 *     published example in their docs is already stale on one of them: it shows
 *     `currency=лв.`, while the live dictionary offers only `EUR` and `USD`.
 *     Hard-coding from the docs would therefore have shipped a broken advert; we
 *     read the live lists instead and validate against them before sending.
 *
 * Cached with plain `"use cache"` + `cacheLife("days")`: the vocabulary changes
 * when mobile.bg adds a brand, i.e. rarely, and each entry is a few KB. Tagged
 * `cars` so the existing kill-switch clears it too.
 */

const BASE_URL = "https://api.mobile.bg/import_api";

/** „Автомобили и Джипове" — the only top category we publish into. */
export const TOPMENU_CARS = "1";
/** „Главна рубрика" — a car for sale (not parts/tyres/services). */
export const RUB_MAIN = "1";

/** One field of the publish form, as `/catfields` describes it. */
export type Catfield = {
  fname: string;
  ftext: string;
  /** `text` = free input, `list` = value must come from the dictionary. */
  ftype: "text" | "list" | string;
  /** Max length in characters, when the field is `text`. */
  flen?: number;
};

/** One allowed value of a `list` field. `optval` is what gets SENT. */
export type DictOption = { optval: string; opttext: string };

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    // Next's own fetch cache is bypassed; the surrounding `"use cache"` is what
    // does the caching, at a lifetime we control.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mobile.bg ${path} → HTTP ${res.status}`);
  return res.json();
}

/** Coerce whatever shape a dictionary key holds into a flat option list. */
function toOptions(value: unknown): DictOption[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  const out: DictOption[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const optval = o.optval;
    if (typeof optval !== "string" && typeof optval !== "number") continue;
    out.push({
      optval: String(optval),
      opttext: typeof o.opttext === "string" ? o.opttext : String(optval),
    });
  }
  return out;
}

/**
 * The field list for cars — 32 entries (marka, model, year, km, price, extri, …).
 * Used by the admin preview to show every field mobile.bg knows about, including
 * the ones we cannot fill, so a gap is visible rather than silently absent.
 */
export async function getCatfields(): Promise<Record<string, Catfield>> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const json = (await fetchJson(`/catfields/${TOPMENU_CARS}/${RUB_MAIN}/`)) as Record<string, Catfield>;
  return json ?? {};
}

/**
 * Every `list` field's allowed values, keyed by field name.
 *
 * `marka` arrives populated (208 brands) but `model` and `locatc` come back
 * EMPTY here — they are dependent lists, resolved per parent value by
 * `getModelOptions` / `getCityOptions`.
 */
export async function getDictionary(): Promise<Record<string, DictOption[]>> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  const json = (await fetchJson(`/dictionary/${TOPMENU_CARS}/${RUB_MAIN}/`)) as Record<string, unknown>;
  const out: Record<string, DictOption[]> = {};
  for (const [key, value] of Object.entries(json ?? {})) out[key] = toOptions(value);
  return out;
}

/**
 * The models mobile.bg recognises FOR ONE BRAND (`Ford` → 66 entries).
 *
 * Brand-scoped by their design, which is why `mobilebg_model_map` stores the
 * `marka` alongside the model: a model string alone is ambiguous.
 */
export async function getModelOptions(marka: string): Promise<DictOption[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  if (!marka) return [];
  const json = (await fetchJson(
    `/dictionary/${TOPMENU_CARS}/${RUB_MAIN}/model/?marka=${encodeURIComponent(marka)}`,
  )) as Record<string, unknown>;
  return toOptions(json?.model ?? json);
}

/**
 * The city list for one region (`locat` → `locatc`).
 *
 * ⚠️ Verified to return an EMPTY array unauthenticated, for every region tried
 * (София, Пловдив, Извън страната). Whether that is an auth gate or a quirk of
 * the public endpoint cannot be determined without import credentials, so the
 * mapper treats `locatc` as optional and the preview flags it. Re-check this the
 * moment the account is authorised.
 */
export async function getCityOptions(locat: string): Promise<DictOption[]> {
  "use cache";
  cacheTag(CACHE_TAGS.cars);
  cacheLife("days");

  if (!locat) return [];
  const json = (await fetchJson(
    `/dictionary/${TOPMENU_CARS}/${RUB_MAIN}/locatc/?locat=${encodeURIComponent(locat)}`,
  )) as Record<string, unknown>;
  return toOptions(json?.locatc ?? json);
}

/**
 * Check every `list` param against the live vocabulary, returning the names of
 * any that would be rejected or silently mis-filed.
 *
 * This is the last gate before a BILLABLE call: mobile.bg does not reliably
 * error on a bad list value, so catching it here is the difference between a
 * visible failure and an advert nobody can find.
 */
export async function validateListValues(
  params: Record<string, string>,
): Promise<{ field: string; value: string }[]> {
  const [fields, dict] = await Promise.all([getCatfields(), getDictionary()]);
  const bad: { field: string; value: string }[] = [];

  for (const [field, value] of Object.entries(params)) {
    if (!value) continue;
    if (fields[field]?.ftype !== "list") continue;

    // `model` and `locatc` are dependent lists (empty in the flat dictionary),
    // and `extri` is a `~`-separated multi-value — both handled below.
    if (field === "model" || field === "locatc") continue;

    const allowed = dict[field];
    if (!allowed || allowed.length === 0) continue;
    const allowedSet = new Set(allowed.map((o) => o.optval));

    const values = field === "extri" ? value.split("~") : [value];
    for (const v of values) {
      if (v && !allowedSet.has(v)) bad.push({ field, value: v });
    }
  }

  // `model` needs its own brand-scoped fetch.
  if (params.model && params.marka) {
    const models = await getModelOptions(params.marka);
    if (models.length > 0 && !models.some((o) => o.optval === params.model)) {
      bad.push({ field: "model", value: params.model });
    }
  }

  return bad;
}
