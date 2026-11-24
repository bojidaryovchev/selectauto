import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * The Carfax lead a visit to /admin/carfax-otcheti came from (`?zayavka=`, the lead drawer's link): its name for the
 * desk's line and its VIN when the link carries none. Leads are admin-only, so null for anyone else.
 */
export async function findCarfaxLeadBrief(id: number): Promise<{ id: number; name: string; vin: string } | null> {
  if (!Number.isInteger(id) || id <= 0 || !(await getAdminSession())) return null;
  const t = schema.carfaxRequests;
  const [row] = await getDb().select({ id: t.id, name: t.fullName, vin: t.vin }).from(t).where(eq(t.id, id));
  return row ?? null;
}
