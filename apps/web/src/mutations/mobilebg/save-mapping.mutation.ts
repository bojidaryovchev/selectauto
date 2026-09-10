"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getDictionary, getModelOptions } from "@/lib/mobilebg/dictionary";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Record an admin-confirmed brand or model mapping.
 *
 * Both actions VALIDATE the chosen string against mobile.bg's live dictionary
 * before storing it. That may look redundant when the value came from a picker
 * we populated from the same source — but the mapping is the thing that decides
 * where a paid advert lands, it outlives the session that created it, and a
 * server action accepts whatever is POSTed to it. Storing an unverifiable string
 * here would push the failure all the way to a published advert.
 */

export type SaveBrandMappingInput = {
  manufacturerExternalId: number;
  marka: string;
};

export async function saveMobilebgBrandMapping(
  input: SaveBrandMappingInput,
): Promise<ActionResult<{ marka: string }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const id = Number(input?.manufacturerExternalId);
  const marka = (input?.marka ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Невалидна марка." };
  if (!marka) return { success: false, error: "Изберете марка от списъка на mobile.bg." };

  const dict = await getDictionary();
  const allowed = dict.marka ?? [];
  if (allowed.length > 0 && !allowed.some((o) => o.optval === marka)) {
    return { success: false, error: `„${marka}“ не е валидна марка в mobile.bg.` };
  }

  const db = getDb();
  await db
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
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const modelId = Number(input?.modelExternalId);
  const brandId = Number(input?.manufacturerExternalId);
  const marka = (input?.marka ?? "").trim();
  const model = (input?.model ?? "").trim();

  if (!Number.isInteger(modelId) || modelId <= 0) return { success: false, error: "Невалиден модел." };
  if (!Number.isInteger(brandId) || brandId <= 0) return { success: false, error: "Невалидна марка." };
  if (!marka || !model) return { success: false, error: "Изберете марка и модел от списъка на mobile.bg." };

  // The model list is brand-SCOPED at mobile.bg, so it is only meaningful to
  // validate the pair together — which is also why both are stored on the row.
  const models = await getModelOptions(marka);
  if (models.length > 0 && !models.some((o) => o.optval === model)) {
    return { success: false, error: `„${model}“ не е валиден модел за марка „${marka}“ в mobile.bg.` };
  }

  const db = getDb();
  await db
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

/** Drop a mapping (a brand renamed upstream, or one confirmed in error). */
export async function deleteMobilebgBrandMapping(
  manufacturerExternalId: number,
): Promise<ActionResult<{ ok: true }>> {
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };
  const id = Number(manufacturerExternalId);
  if (!Number.isInteger(id)) return { success: false, error: "Невалидна марка." };

  const db = getDb();
  // Models were confirmed UNDER this brand, so they cannot outlive it — leaving
  // them would let a car publish with a model whose brand is no longer mapped.
  await db.delete(schema.mobilebgModelMap).where(eq(schema.mobilebgModelMap.manufacturerExternalId, id));
  await db.delete(schema.mobilebgBrandMap).where(eq(schema.mobilebgBrandMap.manufacturerExternalId, id));

  revalidatePath("/admin/mobile-bg");
  return { success: true, data: { ok: true } };
}

export async function deleteMobilebgModelMapping(
  modelExternalId: number,
  manufacturerExternalId: number,
): Promise<ActionResult<{ ok: true }>> {
  if (!(await getAdminSession())) return { success: false, error: "Нямате достъп до тази операция." };
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
