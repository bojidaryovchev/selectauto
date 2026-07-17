import { desc } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type TariffUploadRow = typeof schema.tariffUploads.$inferSelect;

/**
 * Admin-only: the tariff-upload history (newest first) for /admin/tarifi — the
 * audit list + which version is active. Uncached (admin, request-time, low volume).
 */
export async function listTariffUploads(limit = 25): Promise<TariffUploadRow[]> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");
  return getDb()
    .select()
    .from(schema.tariffUploads)
    .orderBy(desc(schema.tariffUploads.createdAt))
    .limit(limit);
}
