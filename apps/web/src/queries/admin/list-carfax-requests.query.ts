import { and, count, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getAdminSession } from "@/lib/admin";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import type { LeadListFilters, LeadPage } from "@/types/admin.type";

export type CarfaxRequestRow = typeof schema.carfaxRequests.$inferSelect;

/**
 * Carfax lead inbox — one page of `carfax_requests`, newest first, for /admin.
 * NOT cached (request-scoped, admin-only, low volume — same reasoning as the
 * favorites queries). Admin-gated defensively (the page + proxy already gate).
 *
 * Filtering: a specific `status`, else everything EXCEPT `archived` (the default
 * working view hides handled-and-filed leads). `q` matches name/phone/vin/email/
 * make/model case-insensitively.
 */
export async function listCarfaxRequests(
  filters: LeadListFilters = {},
): Promise<LeadPage<CarfaxRequestRow>> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const t = schema.carfaxRequests;
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
        ilike(t.fullName, like),
        ilike(t.phone, like),
        ilike(t.vin, like),
        ilike(t.email, like),
        ilike(t.carMake, like),
        ilike(t.carModel, like),
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
