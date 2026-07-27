import { desc, eq, sql } from "drizzle-orm";
import { PAYMENT_STAGES } from "@/constants/contracts";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type ContractPaymentWithRecipient = typeof schema.contractPayments.$inferSelect & {
  recipientName: string | null;
};

export type GeneratedDocumentRow = Pick<
  typeof schema.generatedDocuments.$inferSelect,
  "id" | "kind" | "paymentId" | "version" | "recipientId" | "amountUsd" | "usdEurRate" | "amountEur" | "createdAt"
>;

export type PaymentAttachmentRow = typeof schema.paymentAttachments.$inferSelect;

export type ContractDetail = {
  contract: typeof schema.contracts.$inferSelect;
  client: typeof schema.clients.$inferSelect;
  /** The four stage rows, in display order (Кола, Транспорт, Мито и ДДС, Финално). */
  payments: ContractPaymentWithRecipient[];
  /** The linked deposit (when one was deducted from payment 1), or null. */
  deposit: typeof schema.depositContracts.$inferSelect | null;
  /** Generated document versions for this contract (notices etc.), newest first. */
  documents: GeneratedDocumentRow[];
  /** Uploaded proof-of-payment files across this contract's stages, newest first. */
  attachments: PaymentAttachmentRow[];
  /** Audit trail, newest first (capped at 100). */
  events: (typeof schema.contractEvents.$inferSelect)[];
};

/**
 * Full detail for /admin/dogovori/[id]: contract + client + the four payment
 * stages (with recipient names) + the linked deposit + the audit trail. Returns
 * null when the id doesn't exist. NOT cached; admin-gated defensively.
 */
export async function getContract(id: number): Promise<ContractDetail | null> {
  const session = await getBackOfficeSession();
  if (!session) throw new Error("FORBIDDEN");
  if (!Number.isInteger(id) || id <= 0) return null;

  const db = getDb();
  const c = schema.contracts;

  const [contract] = await db.select().from(c).where(eq(c.id, id));
  if (!contract) return null;
  // A „Наблюдаващ" may only open their OWN contracts — same 404 as a missing id,
  // so the URL doesn't reveal that someone else's contract exists.
  if (!isAdmin(session) && contract.createdBy !== session.user?.id) return null;

  const p = schema.contractPayments;
  const r = schema.paymentRecipients;
  const e = schema.contractEvents;

  const g = schema.generatedDocuments;
  const a = schema.paymentAttachments;
  const [[client], paymentRows, depositRow, documents, attachments, events] = await Promise.all([
    db.select().from(schema.clients).where(eq(schema.clients.id, contract.clientId)),
    db
      .select({ payment: p, recipientName: r.name })
      .from(p)
      .leftJoin(r, eq(r.id, p.recipientId))
      .where(eq(p.contractId, id)),
    contract.depositContractId
      ? db.select().from(schema.depositContracts).where(eq(schema.depositContracts.id, contract.depositContractId))
      : Promise.resolve([]),
    db
      .select({
        id: g.id,
        kind: g.kind,
        paymentId: g.paymentId,
        version: g.version,
        recipientId: g.recipientId,
        amountUsd: g.amountUsd,
        usdEurRate: g.usdEurRate,
        amountEur: g.amountEur,
        createdAt: g.createdAt,
      })
      .from(g)
      .where(eq(g.contractId, id))
      .orderBy(desc(g.createdAt)),
    db
      .select()
      .from(a)
      .where(sql`${a.paymentId} IN (SELECT id FROM contract_payments WHERE contract_id = ${id})`)
      .orderBy(desc(a.createdAt)),
    db
      .select()
      .from(e)
      .where(sql`(${e.entity} = 'contract' AND ${e.entityId} = ${id}) OR (${e.entity} = 'payment' AND ${e.entityId} IN (SELECT id FROM contract_payments WHERE contract_id = ${id}))`)
      .orderBy(desc(e.createdAt), desc(e.id))
      .limit(100),
  ]);

  if (!client) return null;

  const stageOrder = new Map(PAYMENT_STAGES.map((s, i) => [s as string, i]));
  const payments = paymentRows
    .map((row) => ({ ...row.payment, recipientName: row.recipientName }))
    .sort((a, b) => (stageOrder.get(a.stage) ?? 9) - (stageOrder.get(b.stage) ?? 9));

  return { contract, client, payments, deposit: depositRow[0] ?? null, documents, attachments, events };
}
