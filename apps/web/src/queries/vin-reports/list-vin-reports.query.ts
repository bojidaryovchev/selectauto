import { ADMIN_PAGE_SIZE } from "@/constants/admin";
import { can, getSessionWith, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { toVinReportView, type VinReportRow } from "@/lib/vin-report-view";
import type { VinReportView } from "@/types/vin-report.type";
import { count, desc, eq, ilike, inArray, type SQL, sql } from "drizzle-orm";
import type { Session } from "next-auth";

/**
 * Reads of `vin_reports` (migration 0053) for the admin, gated on `reports.order`. Not cached: request-scoped and
 * admin-only, like the lead inboxes.
 *
 * Each row comes with what staff look for beside a report: the newest catalog car with its VIN that isn't
 * de-indexed (through `cars_vin_normalized_idx`, migration 0044 — `cars.vin` is stored only trimmed), the newest
 * contract with it (only for a session that sees every contract), the Carfax lead it was bought for (only for an
 * admin: leads are admin-only) and who bought it.
 *
 * The car is ordered by `c.id + 0`, not `c.id`, ON PURPOSE. With `ORDER BY c.id DESC LIMIT 1` Postgres walks the
 * primary key backwards and filters every row by VIN, betting on an early match (it estimates ~20 000 cars per VIN):
 * for a VIN with no car that read all 4 054 354 rows in 59 s (EXPLAIN ANALYZE on production, 24.11.2026). `+ 0`
 * leaves the key no use for the ordering, so the VIN index finds the car's few rows: 1.7 ms without a car, 4.6 ms
 * with one.
 */

const r = schema.vinReports;

function selectReports(session: Session) {
  const contracts = can(session, "contracts.viewAll");
  const leads = isAdmin(session);
  return getDb()
    .select({
      id: r.id,
      provider: r.provider,
      vin: r.vin,
      status: r.status,
      htmlUrl: r.htmlUrl,
      pdfUrl: r.pdfUrl,
      verifiedReal: r.verifiedReal,
      origin: r.origin,
      carfaxRequestId: r.carfaxRequestId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      // The outer row is named `vin_reports.<column>` in the text, NOT `${r.<column>}`: in a single-table select
      // drizzle renders a column inside a selection `sql` without its table („If `isSingleTable` is true, then
      // columns won't be prefixed with table name", pg-core/dialect.js), so `${r.vin}` became a bare "vin" — which
      // inside `FROM cars c` IS c.vin, and every report showed the newest car and the newest contract.
      orderedByName: sql<string | null>`(SELECT u.name FROM users u WHERE u.id = vin_reports.ordered_by)`,
      orderedByEmail: sql<string | null>`(SELECT u.email FROM users u WHERE u.id = vin_reports.ordered_by)`,
      leadName: leads
        ? sql<string | null>`(SELECT c.full_name FROM carfax_requests c WHERE c.id = vin_reports.carfax_request_id)`
        : sql<string | null>`NULL::text`,
      car: sql<VinReportRow["car"]>`(
        SELECT json_build_object('id', c.id, 'title', c.title, 'year', c.year)
        FROM cars c
        WHERE upper(btrim(c.vin)) = vin_reports.vin AND c.vin IS NOT NULL AND c.deindexed_at IS NULL
        ORDER BY c.id + 0 DESC
        LIMIT 1
      )`,
      contract: contracts
        ? sql<VinReportRow["contract"]>`(
            SELECT json_build_object('id', ct.id, 'number', ct.number)
            FROM contracts ct
            WHERE upper(btrim(ct.vin)) = vin_reports.vin
            ORDER BY ct.id DESC
            LIMIT 1
          )`
        : sql<VinReportRow["contract"]>`NULL::json`,
    })
    .from(r);
}

/** One page of reports, newest first; `q` filters by VIN. Throws without `reports.order` (the page gates first). */
export async function listVinReports(filters: { q?: string; page?: number } = {}): Promise<{
  rows: VinReportView[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const session = await getSessionWith("reports.order");
  if (!session) throw new Error("FORBIDDEN");

  const page = Math.max(1, filters.page ?? 1);
  // A VIN is letters and digits only, so nothing else can be part of a match — and `%` or `_` can't act as wildcards.
  const q = filters.q?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const where: SQL | undefined = q ? ilike(r.vin, `%${q}%`) : undefined;

  const [{ value: total }] = await getDb().select({ value: count() }).from(r).where(where);
  const rows = await selectReports(session)
    .where(where)
    .orderBy(desc(r.createdAt), desc(r.id))
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);

  const now = Date.now();
  return {
    rows: rows.map((row) => toVinReportView(row, now)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

/**
 * Every report for these VINs (normalised), newest first, by VIN — for the VIN desk and the Carfax lead drawer. An
 * empty map without `reports.order`, so the lead inbox still renders for a session without it.
 */
export async function listVinReportsForVins(vins: string[]): Promise<Map<string, VinReportView[]>> {
  const out = new Map<string, VinReportView[]>();
  const wanted = [...new Set(vins.map((v) => v.trim().toUpperCase()).filter((v) => v.length === 17))];
  if (wanted.length === 0) return out;
  const session = await getSessionWith("reports.order");
  if (!session) return out;

  const rows = await selectReports(session).where(inArray(r.vin, wanted)).orderBy(desc(r.createdAt), desc(r.id));
  const now = Date.now();
  for (const row of rows) {
    const list = out.get(row.vin) ?? [];
    list.push(toVinReportView(row, now));
    out.set(row.vin, list);
  }
  return out;
}

/** One report by its row id, or null. Throws without `reports.order`. */
export async function getVinReportView(id: number): Promise<VinReportView | null> {
  const session = await getSessionWith("reports.order");
  if (!session) throw new Error("FORBIDDEN");
  const [row] = await selectReports(session).where(eq(r.id, id));
  return row ? toVinReportView(row) : null;
}
