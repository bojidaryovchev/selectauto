import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";

export type TariffUploadRow = Pick<
  typeof schema.tariffUploads.$inferSelect,
  "id" | "filename" | "inlandRows" | "containerRows" | "note" | "active" | "createdAt"
> & {
  /** Who pasted it (name, else e-mail); null when the account is gone. */
  uploadedByName: string | null;
};

/**
 * Admin-only: the tariff-upload history (newest first) for /admin/tarifi — the
 * audit list + which version is active. The active version is always included,
 * even when it is older than the newest `limit` (re-activated after later
 * uploads). Uncached (admin, request-time, low volume).
 */
export async function listTariffUploads(limit = 25): Promise<TariffUploadRow[]> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const t = schema.tariffUploads;
  const query = () =>
    getDb()
      .select({
        id: t.id,
        filename: t.filename,
        inlandRows: t.inlandRows,
        containerRows: t.containerRows,
        note: t.note,
        active: t.active,
        createdAt: t.createdAt,
        uploadedByName: sql<
          string | null
        >`(SELECT coalesce(u.name, u.email) FROM users u WHERE u.id = ${t.uploadedBy})`,
      })
      .from(t);

  const rows = await query().orderBy(desc(t.createdAt)).limit(limit);
  if (!rows.some((r) => r.active)) {
    const [active] = await query().where(eq(t.active, true)).limit(1);
    if (active) rows.push(active);
  }
  return rows;
}
