import { and, desc, eq, isNull } from "drizzle-orm";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type AvailableDepositRow = {
  id: number;
  number: string;
  clientId: number;
  depositAmount: string;
  budgetCurrency: string;
  depositDate: string;
};

/**
 * Deposits offerable for deduction in the contract-creation wizard (spec §14.1):
 * status 'paid' (депозитът е реално постъпил) and not yet linked to any
 * mediation contract. The single-use guarantee is the partial UNIQUE index on
 * contracts.deposit_contract_id; this query just hides already-used ones. The
 * wizard filters by the selected client on the client side. Admin-gated
 * defensively.
 */
export async function listAvailableDeposits(): Promise<AvailableDepositRow[]> {
  if (!(await getBackOfficeSession())) throw new Error("FORBIDDEN");

  const d = schema.depositContracts;
  const c = schema.contracts;
  return getDb()
    .select({
      id: d.id,
      number: d.number,
      clientId: d.clientId,
      depositAmount: d.depositAmount,
      budgetCurrency: d.budgetCurrency,
      depositDate: d.depositDate,
    })
    .from(d)
    .leftJoin(c, eq(c.depositContractId, d.id))
    // NOT scoped to the creator, unlike the deposit list: a deposit belongs to
    // the client, so a „Наблюдаващ" preparing that client's contract must be
    // able to deduct it even when an admin took the deposit. The applied deposit
    // is frozen at creation, so a missed deduction can't be added afterwards.
    .where(and(eq(d.status, "paid"), isNull(c.id)))
    .orderBy(desc(d.depositDate));
}
