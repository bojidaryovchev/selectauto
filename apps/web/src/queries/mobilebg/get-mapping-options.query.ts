import { desc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { type DictOption, getDictionary, getModelOptions } from "@/lib/mobilebg/dictionary";

/**
 * The data behind the brand/model mapping desk.
 *
 * Mapping is a human decision by design (see migration 0047): mobile.bg's
 * vocabulary is close enough to ours to make string matching look like it works
 * and far enough to be wrong in exactly the cases that matter — `VW` for
 * Volkswagen, `KGM` for SsangYong, `Cherry` AND `Chery` as separate brands,
 * models like `F150` / `Crown victoria` / `C-max`. A wrong model is accepted
 * silently by their API, so the admin picks from THEIR live list and we store
 * the confirmed pair.
 */

export type MobilebgBrandMapRow = {
  manufacturerExternalId: number;
  ourName: string | null;
  marka: string;
  verifiedAt: Date;
};

export type MobilebgModelMapRow = {
  modelExternalId: number;
  manufacturerExternalId: number;
  ourName: string | null;
  marka: string;
  model: string;
  verifiedAt: Date;
};

/** Every confirmed mapping, newest first. */
export async function listMobilebgMappings(): Promise<{
  brands: MobilebgBrandMapRow[];
  models: MobilebgModelMapRow[];
}> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const [brands, models] = await Promise.all([
    db
      .select({
        manufacturerExternalId: schema.mobilebgBrandMap.manufacturerExternalId,
        ourName: schema.manufacturers.name,
        marka: schema.mobilebgBrandMap.marka,
        verifiedAt: schema.mobilebgBrandMap.verifiedAt,
      })
      .from(schema.mobilebgBrandMap)
      .leftJoin(
        schema.manufacturers,
        eq(schema.manufacturers.externalId, schema.mobilebgBrandMap.manufacturerExternalId),
      )
      .orderBy(desc(schema.mobilebgBrandMap.verifiedAt)),
    db
      .select({
        modelExternalId: schema.mobilebgModelMap.modelExternalId,
        manufacturerExternalId: schema.mobilebgModelMap.manufacturerExternalId,
        ourName: schema.vehicleModels.name,
        marka: schema.mobilebgModelMap.marka,
        model: schema.mobilebgModelMap.model,
        verifiedAt: schema.mobilebgModelMap.verifiedAt,
      })
      .from(schema.mobilebgModelMap)
      .leftJoin(
        schema.vehicleModels,
        eq(schema.vehicleModels.externalId, schema.mobilebgModelMap.modelExternalId),
      )
      .orderBy(desc(schema.mobilebgModelMap.verifiedAt)),
  ]);

  return { brands, models };
}

/**
 * mobile.bg's 208 brand strings — the picker's options. Public endpoint, so this
 * works before the import account is authorised.
 */
export async function getMobilebgBrandOptions(): Promise<DictOption[]> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");
  const dict = await getDictionary();
  return dict.marka ?? [];
}

/** The models mobile.bg recognises for one of its brands (`Ford` → 66). */
export async function getMobilebgModelOptions(marka: string): Promise<DictOption[]> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");
  return getModelOptions(marka);
}
