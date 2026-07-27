import { and, desc, eq, isNull } from "drizzle-orm";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
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
  const session = await getBackOfficeSession();
  if (!session) throw new Error("FORBIDDEN");

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
    .where(
      and(
        eq(d.status, "paid"),
        isNull(c.id),
        // Scoped like the deposit list: an observer can only apply a deposit
        // they created themselves.
        isAdmin(session) ? undefined : eq(d.createdBy, session.user?.id ?? ""),
      ),
    )
    .orderBy(desc(d.depositDate));
}
