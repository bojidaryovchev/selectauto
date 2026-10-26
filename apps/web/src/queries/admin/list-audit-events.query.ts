import { AUDIT_PAGE_SIZE } from "@/constants/audit";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { count, desc, eq, sql, type SQL } from "drizzle-orm";

/**
 * The global audit log — every `contract_events` row, whatever wrote it.
 *
 * Until now this table was only rendered for a single contract, so anything
 * written against another entity (role changes, and now paid de-listings) was
 * effectively write-only. This is the read side.
 */

export type AuditEventRow = {
  id: number;
  entity: string;
  entityId: number;
  action: string;
  actorEmail: string | null;
  data: unknown;
  createdAt: Date;
  /** The contract a contract or payment event belongs to — null once it is deleted. */
  contractId: number | null;
  /** A deposit event's deposit still exists. */
  depositExists: boolean;
};

export async function listAuditEvents(options: { page?: number; entity?: string }): Promise<{
  rows: AuditEventRow[];
  total: number;
  page: number;
  pageCount: number;
  entities: string[];
}> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const e = schema.contractEvents;

  const where: SQL | undefined = options.entity ? eq(e.entity, options.entity) : undefined;

  const [totalRow] = await db.select({ n: count() }).from(e).where(where);
  const total = totalRow?.n ?? 0;

  const rows = await db
    .select({
      id: e.id,
      entity: e.entity,
      entityId: e.entityId,
      action: e.action,
      data: e.data,
      createdAt: e.createdAt,
      actorEmail: sql<string | null>`(SELECT u.email FROM users u WHERE u.id = ${e.actorId})`,
      contractId: sql<number | null>`CASE ${e.entity}
        WHEN 'contract' THEN (SELECT c.id FROM contracts c WHERE c.id = ${e.entityId})
        WHEN 'payment' THEN (SELECT cp.contract_id FROM contract_payments cp WHERE cp.id = ${e.entityId})
      END`,
      depositExists: sql<boolean>`${e.entity} = 'deposit' AND EXISTS (SELECT 1 FROM deposit_contracts d WHERE d.id = ${e.entityId})`,
    })
    .from(e)
    .where(where)
    // A transaction stamps all its rows with one created_at (83 such groups in
    // production), so without the id a page boundary could repeat or skip rows.
    .orderBy(desc(e.createdAt), desc(e.id))
    .limit(AUDIT_PAGE_SIZE)
    .offset((page - 1) * AUDIT_PAGE_SIZE);

  // The filter chips are derived from what actually exists, so a new event
  // source shows up without touching this file.
  const entityRows = await db.selectDistinct({ entity: e.entity }).from(e);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    entities: entityRows.map((r) => r.entity).sort(),
  };
}
