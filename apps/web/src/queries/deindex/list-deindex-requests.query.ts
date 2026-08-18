import { count, desc, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";

/**
 * The de-listing register: every request, active and revoked.
 *
 * For a PAID service this list IS the audit trail — who asked, what proof was
 * recorded, what was charged, who actioned it, and whether it is still in force.
 * `car_count` is resolved live from the VIN rather than stored, so it stays
 * honest if the vehicle is re-ingested under a new car row later.
 */

export type DeindexRequestRow = {
  id: number;
  vinNormalized: string;
  requesterName: string | null;
  requesterContact: string | null;
  proofNote: string | null;
  feeAmount: string | null;
  feeCurrency: string;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  createdByEmail: string | null;
  revokedAt: Date | null;
  revokedByEmail: string | null;
  carCount: number;
  suppressedCount: number;
};

export async function listDeindexRequests(page = 1): Promise<{
  rows: DeindexRequestRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const current = Math.max(1, page);

  const [totalRow] = await db.select({ n: count() }).from(schema.carDeindexRequests);
  const total = totalRow?.n ?? 0;

  const creator = sql<string | null>`(SELECT u.email FROM users u WHERE u.id = ${schema.carDeindexRequests.createdBy})`;
  const revoker = sql<string | null>`(SELECT u.email FROM users u WHERE u.id = ${schema.carDeindexRequests.revokedBy})`;

  const rows = await db
    .select({
      id: schema.carDeindexRequests.id,
      vinNormalized: schema.carDeindexRequests.vinNormalized,
      requesterName: schema.carDeindexRequests.requesterName,
      requesterContact: schema.carDeindexRequests.requesterContact,
      proofNote: schema.carDeindexRequests.proofNote,
      feeAmount: schema.carDeindexRequests.feeAmount,
      feeCurrency: schema.carDeindexRequests.feeCurrency,
      paidAt: schema.carDeindexRequests.paidAt,
      notes: schema.carDeindexRequests.notes,
      createdAt: schema.carDeindexRequests.createdAt,
      createdByEmail: creator,
      revokedAt: schema.carDeindexRequests.revokedAt,
      revokedByEmail: revoker,
      // Live, not stored: how many car rows this VIN owns, and how many of them
      // are actually suppressed right now.
      carCount: sql<number>`(SELECT count(*)::int FROM cars c WHERE upper(btrim(c.vin)) = ${schema.carDeindexRequests.vinNormalized})`,
      suppressedCount: sql<number>`(SELECT count(*)::int FROM cars c WHERE upper(btrim(c.vin)) = ${schema.carDeindexRequests.vinNormalized} AND c.deindexed_at IS NOT NULL)`,
    })
    .from(schema.carDeindexRequests)
    .orderBy(desc(schema.carDeindexRequests.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset((current - 1) * ADMIN_PAGE_SIZE);

  return {
    rows,
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}
