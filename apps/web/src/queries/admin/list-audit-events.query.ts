import { count, desc, eq, sql, type SQL } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { AUDIT_PAGE_SIZE } from "@/constants/audit";

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

  const where: SQL | undefined = options.entity
    ? eq(schema.contractEvents.entity, options.entity)
    : undefined;

  const [totalRow] = await db.select({ n: count() }).from(schema.contractEvents).where(where);
  const total = totalRow?.n ?? 0;

  const rows = await db
    .select({
      id: schema.contractEvents.id,
      entity: schema.contractEvents.entity,
      entityId: schema.contractEvents.entityId,
      action: schema.contractEvents.action,
      data: schema.contractEvents.data,
      createdAt: schema.contractEvents.createdAt,
      actorEmail: sql<
        string | null
      >`(SELECT u.email FROM users u WHERE u.id = ${schema.contractEvents.actorId})`,
    })
    .from(schema.contractEvents)
    .where(where)
    .orderBy(desc(schema.contractEvents.createdAt))
    .limit(AUDIT_PAGE_SIZE)
    .offset((page - 1) * AUDIT_PAGE_SIZE);

  // The filter chips are derived from what actually exists, so a new event
  // source shows up without touching this file.
  const entityRows = await db
    .selectDistinct({ entity: schema.contractEvents.entity })
    .from(schema.contractEvents);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    entities: entityRows.map((e) => e.entity).sort(),
  };
}
