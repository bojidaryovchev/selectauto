import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import { PAYMENT_STAGES, type PaymentStage, type PaymentStatus } from "@/constants/contracts";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type ContractListRow = {
  contract: typeof schema.contracts.$inferSelect;
  clientName: string;
  /** Stage → status, for the four status chips on the list row. */
  stages: Partial<Record<PaymentStage, PaymentStatus>>;
};

export type ContractListFilters = {
  q?: string;
  status?: string;
  page?: number;
};

export type ContractListPage = {
  rows: ContractListRow[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * One page of mediation contracts for /admin/dogovori, newest first. `q`
 * matches number/VIN/make/model/client-name case-insensitively; `status`
 * filters the contract lifecycle (default = everything). The four stage
 * statuses ride along via one IN-query over contract_payments (grouped in JS) —
 * no per-row roundtrips. NOT cached (request-scoped, admin-only, low volume).
 */
export async function listContracts(filters: ContractListFilters = {}): Promise<ContractListPage> {
  const session = await getBackOfficeSession();
  if (!session) throw new Error("FORBIDDEN");

  const db = getDb();
  const c = schema.contracts;
  const cl = schema.clients;
  const page = Math.max(1, filters.page ?? 1);

  const conds: SQL[] = [];
  // „Наблюдаващ" sees ONLY the contracts they created (owner spec 07.2026 — each
  // agent follows their own deals); an admin sees everything.
  if (!isAdmin(session)) {
    conds.push(eq(c.createdBy, session.user?.id ?? ""));
  }
  if (filters.status) {
    conds.push(eq(c.status, filters.status));
  }
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(ilike(c.number, like), ilike(c.vin, like), ilike(c.carMake, like), ilike(c.carModel, like), ilike(cl.name, like))!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(c)
    .innerJoin(cl, eq(cl.id, c.clientId))
    .where(where);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const rows = await db
    .select({ contract: c, clientName: cl.name })
    .from(c)
    .innerJoin(cl, eq(cl.id, c.clientId))
    .where(where)
    .orderBy(desc(c.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);

  // Stage chips for this page's contracts, one query, grouped in JS.
  const ids = rows.map((r) => r.contract.id);
  const stagesByContract = new Map<number, Partial<Record<PaymentStage, PaymentStatus>>>();
  if (ids.length > 0) {
    const p = schema.contractPayments;
    const payments = await db
      .select({ contractId: p.contractId, stage: p.stage, status: p.status })
      .from(p)
      .where(inArray(p.contractId, ids));
    for (const row of payments) {
      if (!(PAYMENT_STAGES as readonly string[]).includes(row.stage)) continue;
      const entry = stagesByContract.get(row.contractId) ?? {};
      entry[row.stage as PaymentStage] = row.status as PaymentStatus;
      stagesByContract.set(row.contractId, entry);
    }
  }

  return {
    rows: rows.map((r) => ({ ...r, stages: stagesByContract.get(r.contract.id) ?? {} })),
    total,
    page,
    pageCount,
  };
}
