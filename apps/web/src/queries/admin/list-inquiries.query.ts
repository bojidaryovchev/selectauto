import { and, count, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getAdminSession } from "@/lib/admin";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import type { LeadListFilters, LeadPage } from "@/types/admin.type";

export type InquiryRow = typeof schema.inquiries.$inferSelect;

/**
 * "Безплатна консултация" lead inbox — one page of `inquiries`, newest first,
 * for /admin. Same shape/semantics as listCarfaxRequests. `q` matches name/
 * phone/brand/model/specificModel case-insensitively.
 */
export async function listInquiries(
  filters: LeadListFilters = {},
): Promise<LeadPage<InquiryRow>> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const t = schema.inquiries;
  const page = Math.max(1, filters.page ?? 1);

  const conds: SQL[] = [];
  if (filters.status) {
    conds.push(eq(t.status, filters.status));
  } else {
    conds.push(ne(t.status, "archived"));
  }
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(t.name, like),
        ilike(t.phone, like),
        ilike(t.brand, like),
        ilike(t.model, like),
        ilike(t.specificModel, like),
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ value: total }] = await db.select({ value: count() }).from(t).where(where);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const rows = await db
    .select()
    .from(t)
    .where(where)
    .orderBy(desc(t.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);

  return { rows, total, page, pageCount };
}
