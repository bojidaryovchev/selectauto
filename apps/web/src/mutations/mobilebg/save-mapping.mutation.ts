"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { type DictOption, getDictionary, getModelOptions } from "@/lib/mobilebg/dictionary";
import { vocabKey } from "@/lib/mobilebg/vocab-match";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Remember an admin-confirmed brand or model pairing, picked in the advert
 * preview.
 *
 * The chosen value is looked up again in mobile.bg's LIVE list and the LIST'S
 * own string is what gets stored — never the posted one. Their values are the
 * exact strings the API compares against, quirks included: models such as
 * "Leaf " and "Veloster " carry a trailing space. Storing a trimmed or retyped
 * copy would produce a mapping that never validates. And a server action accepts
 * whatever is POSTed to it, while this row decides where a paid advert lands.
 */

/** The list entry the admin meant: exact string first, then the same key. */
function pick(options: DictOption[], wanted: string | undefined): string | null {
  if (!wanted) return null;
  const exact = options.find((o) => o.optval === wanted);
  if (exact) return exact.optval;
  const key = vocabKey(wanted);
  const byKey = key ? options.filter((o) => vocabKey(o.optval) === key) : [];
  return byKey.length === 1 ? byKey[0].optval : null;
}

export type SaveBrandMappingInput = {
  manufacturerExternalId: number;
  marka: string;
};

export async function saveMobilebgBrandMapping(
  input: SaveBrandMappingInput,
): Promise<ActionResult<{ marka: string }>> {
  const session = await getBackOfficeSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const id = Number(input?.manufacturerExternalId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Невалидна марка." };

  let marka: string | null;
  try {
    marka = pick((await getDictionary()).marka ?? [], input?.marka);
  } catch (error) {
    console.error("[mobilebg] brand dictionary unavailable", error);
    return { success: false, error: "Речникът на mobile.bg не е достъпен. Опитайте отново." };
  }
  if (!marka) return { success: false, error: `„${input?.marka ?? ""}“ не е марка в mobile.bg.` };

  await getDb()
    .insert(schema.mobilebgBrandMap)
    .values({
      manufacturerExternalId: id,
      marka,
      verifiedBy: session.user?.id ?? null,
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.mobilebgBrandMap.manufacturerExternalId,
      set: { marka, verifiedBy: session.user?.id ?? null, verifiedAt: new Date() },
    });

  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { marka } };
}

export type SaveModelMappingInput = {
  modelExternalId: number;
  manufacturerExternalId: number;
  marka: string;
  model: string;
};

export async function saveMobilebgModelMapping(
  input: SaveModelMappingInput,
): Promise<ActionResult<{ marka: string; model: string }>> {
  const session = await getBackOfficeSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const modelId = Number(input?.modelExternalId);
  const brandId = Number(input?.manufacturerExternalId);
  if (!Number.isInteger(modelId) || modelId <= 0) return { success: false, error: "Невалиден модел." };
  if (!Number.isInteger(brandId) || brandId <= 0) return { success: false, error: "Невалидна марка." };

  // The model list is brand-SCOPED at mobile.bg, so the pair is only meaningful
  // validated together — which is also why both are stored on the row.
  let marka: string | null;
  let model: string | null;
  try {
    marka = pick((await getDictionary()).marka ?? [], input?.marka);
    model = marka ? pick(await getModelOptions(marka), input?.model) : null;
  } catch (error) {
    console.error("[mobilebg] model dictionary unavailable", error);
    return { success: false, error: "Речникът на mobile.bg не е достъпен. Опитайте отново." };
  }
  if (!marka) return { success: false, error: `„${input?.marka ?? ""}“ не е марка в mobile.bg.` };
  if (!model) {
    return { success: false, error: `„${input?.model ?? ""}“ не е модел на „${marka}“ в mobile.bg.` };
  }

  await getDb()
    .insert(schema.mobilebgModelMap)
    .values({
      modelExternalId: modelId,
      manufacturerExternalId: brandId,
      marka,
      model,
      verifiedBy: session.user?.id ?? null,
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.mobilebgModelMap.modelExternalId,
      set: {
        manufacturerExternalId: brandId,
        marka,
        model,
        verifiedBy: session.user?.id ?? null,
        verifiedAt: new Date(),
      },
    });

  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { marka, model } };
}

/** Forget a brand override — the brand goes back to automatic resolution. */
export async function deleteMobilebgBrandMapping(
  manufacturerExternalId: number,
): Promise<ActionResult<{ ok: true }>> {
  if (!(await getBackOfficeSession())) return { success: false, error: "Нямате достъп до тази операция." };
  const id = Number(manufacturerExternalId);
  if (!Number.isInteger(id)) return { success: false, error: "Невалидна марка." };

  const db = getDb();
  // Models were confirmed UNDER this brand's mobile.bg name, so they cannot
  // outlive it — leaving them would pair a model with a brand it was never
  // checked against.
  await db.delete(schema.mobilebgModelMap).where(eq(schema.mobilebgModelMap.manufacturerExternalId, id));
  await db.delete(schema.mobilebgBrandMap).where(eq(schema.mobilebgBrandMap.manufacturerExternalId, id));

  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { ok: true } };
}

/** Forget a model override — the model goes back to automatic resolution. */
export async function deleteMobilebgModelMapping(
  modelExternalId: number,
  manufacturerExternalId: number,
): Promise<ActionResult<{ ok: true }>> {
  if (!(await getBackOfficeSession())) return { success: false, error: "Нямате достъп до тази операция." };
  const modelId = Number(modelExternalId);
  const brandId = Number(manufacturerExternalId);
  if (!Number.isInteger(modelId) || !Number.isInteger(brandId)) {
    return { success: false, error: "Невалиден модел." };
  }

  await getDb()
    .delete(schema.mobilebgModelMap)
    .where(
      and(
        eq(schema.mobilebgModelMap.modelExternalId, modelId),
        eq(schema.mobilebgModelMap.manufacturerExternalId, brandId),
      ),
    );

  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { ok: true } };
}
