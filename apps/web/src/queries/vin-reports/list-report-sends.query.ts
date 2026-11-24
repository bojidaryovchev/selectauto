import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

/**
 * When each report was last e-mailed to each of these Carfax leads, keyed `${reportId}:${leadId}`, with the Поща
 * conversation it went into — for the lead drawer's „Изпратен на клиента на …". Read from the log
 * (`contract_events`, action `sent_to_client`), which mutations/vin-reports/send-report-to-client.mutation.ts writes
 * with each send. Leads are admin-only, so an empty map for anyone else.
 */
export async function listVinReportSends(
  leadIds: number[],
): Promise<Map<string, { sentAtText: string; threadId: number | null }>> {
  const out = new Map<string, { sentAtText: string; threadId: number | null }>();
  const ids = [...new Set(leadIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0 || !(await getAdminSession())) return out;

  const e = schema.contractEvents;
  const leadOf = sql<number>`(${e.data}->>'carfaxRequestId')::int`;
  const rows = await getDb()
    .select({
      reportId: e.entityId,
      leadId: leadOf,
      threadId: sql<number | null>`(${e.data}->>'threadId')::int`,
      createdAt: e.createdAt,
    })
    .from(e)
    .where(and(eq(e.entity, "vin_report"), eq(e.action, "sent_to_client"), inArray(leadOf, ids)))
    .orderBy(desc(e.createdAt));
  for (const row of rows) {
    const key = `${row.reportId}:${row.leadId}`;
    if (!out.has(key)) out.set(key, { sentAtText: formatSofiaDateTime(row.createdAt), threadId: row.threadId });
  }
  return out;
}

/**
 * AuctionsAPI's vehicle name per VIN („HONDA CR-V EX 2018"), from the free check's cache (`vin_report_checks`), for
 * the report e-mail's default text. VINs never checked are simply absent.
 */
export async function listCheckedVehicles(vins: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(vins.map((v) => v.trim().toUpperCase()).filter((v) => v.length === 17))];
  if (wanted.length === 0 || !(await getAdminSession())) return out;
  const c = schema.vinReportChecks;
  const rows = await getDb().select({ vin: c.vin, vehicle: c.vehicle }).from(c).where(inArray(c.vin, wanted));
  for (const row of rows) if (row.vehicle) out.set(row.vin, row.vehicle);
  return out;
}
