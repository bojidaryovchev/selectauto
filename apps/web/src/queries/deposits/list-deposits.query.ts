import { desc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type DepositListRow = {
  deposit: typeof schema.depositContracts.$inferSelect;
  clientName: string;
  /** The mediation contract this deposit was deducted into, when 'used'. */
  usedBy: { id: number; number: string } | null;
};

/**
 * All deposit contracts for /admin/depoziti, newest first. Deliberately
 * unpaginated (deposits accrue at deal pace). The used-by link rides a LEFT
 * JOIN on contracts.deposit_contract_id (§14.3 — the history keeps the
 * deposit↔contract relation visible). Admin-gated defensively.
 */
export async function listDeposits(): Promise<DepositListRow[]> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

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
    .orderBy(desc(d.createdAt));

  return rows.map((r) => ({
    deposit: r.deposit,
    clientName: r.clientName,
    usedBy: r.usedById && r.usedByNumber ? { id: r.usedById, number: r.usedByNumber } : null,
  }));
}
