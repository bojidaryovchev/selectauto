import "server-only";
import { getDictionary, getModelOptions } from "./dictionary";
import { type BrandSource, type ModelSource, matchBrand, matchModel, vocabKey } from "./vocab-match";

/**
 * Decide which mobile.bg brand and model a car publishes under. Order of
 * authority, strongest first:
 *
 *   1. a model picked for THIS advert in the preview (per-advert override);
 *   2. an admin-confirmed mapping row (`mobilebg_brand_map` / `mobilebg_model_map`);
 *   3. automatic resolution against mobile.bg's LIVE vocabulary (vocab-match.ts).
 *
 * Automatic resolution is the default path, not the exception: measured on the
 * active catalog, it resolves ~95% of cars by brand and ~89% by model on exact
 * names alone, before the title-designation step lifts BMW and Mercedes. The
 * mapping tables are what they should be — the remembered exceptions for names
 * mobile.bg genuinely spells differently ("Avante" → "Elantra").
 *
 * Stored and overridden values are re-checked against the live list, so a
 * mapping mobile.bg has since renamed or dropped can never reach an advert.
 */

export type MarkaSource = "manual" | BrandSource;
export type ResolvedModelSource = "override" | "manual" | ModelSource;

export type ResolvedMapping = {
  marka: string | null;
  markaSource: MarkaSource | null;
  model: string | null;
  modelSource: ResolvedModelSource | null;
  /** What the model was derived from ("330I" in the title, …) — shown in the preview. */
  modelEvidence: string | null;
  /** mobile.bg's full brand list — sent only while the brand is unresolved (picker). */
  markaOptions: string[];
  /** The resolved brand's model list (picker); empty until a brand is known. */
  modelOptions: string[];
  /** True when mobile.bg's dictionary could not be reached, so nothing was verified. */
  unavailable: boolean;
};

const EMPTY: ResolvedMapping = {
  marka: null,
  markaSource: null,
  model: null,
  modelSource: null,
  modelEvidence: null,
  markaOptions: [],
  modelOptions: [],
  unavailable: false,
};

export async function resolveMobilebgMapping(args: {
  brandName: string | null;
  modelName: string | null;
  title: string | null;
  year: number | null;
  manualMarka: string | null;
  manualModel: { marka: string; model: string } | null;
  overrideModel?: string;
}): Promise<ResolvedMapping> {
  let markaList: string[];
  try {
    markaList = ((await getDictionary()).marka ?? []).map((o) => o.optval);
  } catch (error) {
    console.error("[mobilebg] brand dictionary unavailable", error);
    return { ...EMPTY, unavailable: true };
  }

  // ── Brand ──
  let marka: string | null = null;
  let markaSource: MarkaSource | null = null;
  if (args.manualMarka && markaList.includes(args.manualMarka)) {
    marka = args.manualMarka;
    markaSource = "manual";
  } else {
    const auto = matchBrand(args.brandName, markaList);
    if (auto) {
      marka = auto.marka;
      markaSource = auto.source;
    }
  }
  if (!marka) return { ...EMPTY, markaOptions: markaList };

  // ── Model (their list is brand-scoped) ──
  let modelList: string[];
  try {
    modelList = (await getModelOptions(marka)).map((o) => o.optval);
  } catch (error) {
    console.error("[mobilebg] model dictionary unavailable", marka, error);
    return { ...EMPTY, marka, markaSource, unavailable: true };
  }

  const base: ResolvedMapping = { ...EMPTY, marka, markaSource, modelOptions: modelList };

  if (args.overrideModel) {
    const wanted = vocabKey(args.overrideModel);
    const hit = modelList.includes(args.overrideModel)
      ? args.overrideModel
      : modelList.find((m) => vocabKey(m) === wanted);
    if (hit) return { ...base, model: hit, modelSource: "override" };
  }

  // A remembered model counts only under the brand it was confirmed for.
  if (
    args.manualModel &&
    args.manualModel.marka === marka &&
    modelList.includes(args.manualModel.model)
  ) {
    return { ...base, model: args.manualModel.model, modelSource: "manual" };
  }

  const auto = matchModel({
    ourBrand: args.brandName,
    marka,
    ourModel: args.modelName,
    title: args.title,
    year: args.year,
    modelList,
  });
  if (auto) return { ...base, model: auto.model, modelSource: auto.source, modelEvidence: auto.evidence };

  return base;
}
