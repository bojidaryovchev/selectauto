import { desc, eq } from "drizzle-orm";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type DepositDocumentRow = { id: number; version: number; createdAt: Date };

export type DepositListRow = {
  deposit: typeof schema.depositContracts.$inferSelect;
  clientName: string;
  /** The mediation contract this deposit was deducted into, when 'used'. */
  usedBy: { id: number; number: string } | null;
  /** Generated deposit-contract versions, newest first. */
  documents: DepositDocumentRow[];
};

/**
 * All deposit contracts for /admin/depoziti, newest first. Deliberately
 * unpaginated (deposits accrue at deal pace). The used-by link rides a LEFT
 * JOIN on contracts.deposit_contract_id (§14.3 — the history keeps the
 * deposit↔contract relation visible). Admin-gated defensively.
 */
export async function listDeposits(): Promise<DepositListRow[]> {
  const session = await getBackOfficeSession();
  if (!session) throw new Error("FORBIDDEN");

  const d = schema.depositContracts;
  const c = schema.contracts;
  const cl = schema.clients;

  const rows = await getDb()
    .select({
      deposit: d,
      clientName: cl.name,
      usedById: c.id,
      usedByNumber: c.number,
    })
    .from(d)
    .innerJoin(cl, eq(cl.id, d.clientId))
    .leftJoin(c, eq(c.depositContractId, d.id))
    // „Наблюдаващ" sees only their own deposits (same rule as contracts).
    .where(isAdmin(session) ? undefined : eq(d.createdBy, session.user?.id ?? ""))
    .orderBy(desc(d.createdAt));

  // Generated deposit contracts for these rows, in one query.
  const g = schema.generatedDocuments;
  const docs = rows.length
    ? await getDb()
        .select({ id: g.id, depositId: g.depositContractId, version: g.version, createdAt: g.createdAt })
        .from(g)
        .where(eq(g.kind, "deposit_contract"))
        .orderBy(desc(g.version))
    : [];

  return rows.map((r) => ({
    deposit: r.deposit,
    clientName: r.clientName,
    usedBy: r.usedById && r.usedByNumber ? { id: r.usedById, number: r.usedByNumber } : null,
    documents: docs
      .filter((d) => d.depositId === r.deposit.id)
      .map((d) => ({ id: d.id, version: d.version, createdAt: d.createdAt })),
  }));
}
