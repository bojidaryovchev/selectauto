import { desc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

/**
 * The remembered brand/model overrides — every pairing an admin confirmed from
 * the advert preview.
 *
 * Mostly empty by design: resolution against mobile.bg's live vocabulary covers
 * the bulk of the catalog on its own (lib/mobilebg/resolve.ts). What lands here
 * are the names mobile.bg genuinely spells differently ("Avante" → "Elantra",
 * "M-klasse" → "ML"), each confirmed once.
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
