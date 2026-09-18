import { getBackOfficeSession } from "@/lib/admin";
import { isConfigured } from "@/lib/mobilebg/client";
import {
  type Catfield,
  getCatfields,
  getCityOptions,
  getDictionary,
  validateListValues,
} from "@/lib/mobilebg/dictionary";
import {
  type MappedAdvert,
  type MobilebgCarSource,
  type MobilebgOverrides,
  LOCAT_ABROAD,
  buildAdvertParams,
  hashParams,
} from "@/lib/mobilebg/map-car";
import type { ResolvedMapping } from "@/lib/mobilebg/resolve";
import { getCalcConfig } from "@/queries/tariffs";
import { getMobilebgCarSource } from "./get-advert-source.query";

/**
 * The full, sendable advert for one car — computed but NOT sent.
 *
 * This is the screen an admin signs off before any money is spent, so it shows
 * the truth about the payload rather than a summary of it: every parameter as it
 * would go over the wire, how the brand and model were resolved (and from what
 * evidence), every field we could not fill, every blocking reason, and the price
 * with its derivation.
 *
 * It also runs `validateListValues` against mobile.bg's LIVE dictionary — the one
 * check that cannot be done offline. mobile.bg rejects a value outside its lists
 * only once the publish call is made; checking here surfaces it in the preview.
 *
 * Works with no credentials at all: `/catfields` and `/dictionary` are public.
 * `credentialsConfigured` reports whether the send button can do anything.
 */

export type MobilebgPreview = {
  source: MobilebgCarSource;
  mapping: ResolvedMapping;
  mapped: MappedAdvert;
  /** mobile.bg's own field descriptions, for rendering the payload table. */
  catfields: Record<string, Catfield>;
  /** `list` params whose value is not in mobile.bg's vocabulary — always fatal. */
  invalidValues: { field: string; value: string }[];
  /** Hash of the params about to be sent, compared against the stored one. */
  payloadHash: string;
  /** True when nothing has changed since the last successful publish. */
  unchanged: boolean;
  /** Existing advert row, when this car has been submitted before. */
  advert: {
    ida: string | null;
    status: string;
    payloadHash: string | null;
    publishedAt: Date | null;
    lastError: string | null;
    pictureCount: number;
  } | null;
  /** False when MOBILEBG_USERNAME / MOBILEBG_PASSWORD are absent. */
  credentialsConfigured: boolean;
  /** The markup % that produced the price, echoed for the UI. */
  markupPct: number;
  /** mobile.bg's countries under „Извън страната“ (the country picker). */
  countryOptions: string[];
  /** mobile.bg's car categories (the category picker). */
  categoryOptions: string[];
};

export async function getMobilebgPreview(
  carId: number,
  overrides?: MobilebgOverrides,
): Promise<MobilebgPreview | null> {
  if (!(await getBackOfficeSession())) throw new Error("FORBIDDEN");

  const found = await getMobilebgCarSource(carId, overrides?.model);
  if (!found) return null;

  const config = await getCalcConfig();
  const mapped = buildAdvertParams({
    source: found.source,
    mapping: found.mapping,
    config,
    overrides,
  });

  // Only worth asking mobile.bg about a payload that exists.
  let catfields: Record<string, Catfield> = {};
  let invalidValues: { field: string; value: string }[] = [];
  let countryOptions: string[] = [];
  let categoryOptions: string[] = [];
  try {
    const [fields, countries, dict] = await Promise.all([
      getCatfields(),
      getCityOptions(LOCAT_ABROAD),
      getDictionary(),
    ]);
    catfields = fields;
    countryOptions = countries.map((o) => o.optval);
    categoryOptions = (dict.category ?? []).map((o) => o.optval);
    if (Object.keys(mapped.params).length > 0) {
      invalidValues = await validateListValues(mapped.params);
    }
  } catch (error) {
    // Their public endpoints being down must not blank the preview — the payload
    // is still correct, we just could not re-verify the vocabulary.
    console.error("[mobilebg] dictionary lookup failed", error);
  }

  const payloadHash = hashParams(mapped.params);

  return {
    source: found.source,
    mapping: found.mapping,
    mapped,
    catfields,
    invalidValues,
    payloadHash,
    unchanged:
      found.advert?.status === "published" &&
      found.advert.payloadHash !== null &&
      found.advert.payloadHash === payloadHash,
    advert: found.advert,
    credentialsConfigured: isConfigured(),
    markupPct: config.mobilebgMarkupPct,
    countryOptions,
    categoryOptions,
  };
}
