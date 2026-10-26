import { and, desc, eq, isNull, ne, notInArray, sql } from "drizzle-orm";
import { getSessionWith, visibleRecords } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type NoticeToSendRow = {
  documentId: number;
  version: number;
  createdAt: Date;
  stage: string;
  contractId: number;
  contractNumber: string;
  market: string;
  clientName: string;
};

/**
 * The „за изпращане към клиента" list (owner, 26.10.2026): payment notices the
 * owner issued that nobody has marked as forwarded to the client yet. Only the
 * NEWEST version per stage counts (a regeneration supersedes the older ones),
 * and a stage that is already paid or cancelled — or whose contract is
 * cancelled — has nothing left to send. Scoped like every contract read
 * (`visibleRecords`). Newest first. For whoever forwards the notices
 * (`notices.markSent`) and, read-only, whoever issues them (`notices.generate`).
 */
export async function listNoticesToSend(): Promise<NoticeToSendRow[]> {
  const session = (await getSessionWith("notices.markSent")) ?? (await getSessionWith("notices.generate"));
  if (!session) throw new Error("FORBIDDEN");

  const g = schema.generatedDocuments;
  const p = schema.contractPayments;
  const c = schema.contracts;
  const cl = schema.clients;

  return getDb()
    .select({
      documentId: g.id,
      version: g.version,
      createdAt: g.createdAt,
      stage: p.stage,
      contractId: c.id,
      contractNumber: c.number,
      market: c.market,
      clientName: cl.name,
    })
    .from(g)
    .innerJoin(p, eq(p.id, g.paymentId))
    .innerJoin(c, eq(c.id, p.contractId))
    .innerJoin(cl, eq(cl.id, c.clientId))
    .where(
      and(
        eq(g.kind, "payment_notice"),
        isNull(g.clientSentAt),
        sql`NOT EXISTS (SELECT 1 FROM generated_documents newer WHERE newer.kind = 'payment_notice' AND newer.payment_id = ${g.paymentId} AND newer.version > ${g.version})`,
        notInArray(p.status, ["paid", "cancelled"]),
        ne(c.status, "cancelled"),
        visibleRecords(session, c.createdBy),
      ),
    )
    .orderBy(desc(g.createdAt));
}
