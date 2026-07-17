import { and, count, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getAdminSession } from "@/lib/admin";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import type { LeadListFilters, LeadPage } from "@/types/admin.type";

export type CalculatorOfferRow = typeof schema.calculatorOffers.$inferSelect;

/**
 * /kalkulator gated-offer lead inbox — one page of `calculator_offers`, newest
 * first, for /admin. Same shape/semantics as listCarfaxRequests. `q` matches
 * name/phone/email case-insensitively. Each row carries `breakdownJson`, the
 * exact estimate the visitor saw — rendered in the detail drawer.
 */
export async function listCalculatorOffers(
  filters: LeadListFilters = {},
): Promise<LeadPage<CalculatorOfferRow>> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const t = schema.calculatorOffers;
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
    conds.push(or(ilike(t.name, like), ilike(t.phone, like), ilike(t.email, like))!);
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
