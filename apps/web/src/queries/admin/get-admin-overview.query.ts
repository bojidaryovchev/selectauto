import { count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getAdminSession } from "@/lib/admin";
import { LEAD_STATUSES, type LeadStatus, type LeadType } from "@/constants/admin";

/** Per-status counts for one lead type, plus `new` and grand total shortcuts. */
export type StatusCounts = Record<LeadStatus, number> & { total: number };

export type AdminOverview = Record<LeadType, StatusCounts>;

/** Zeroed counts, filled from a grouped query. */
function emptyCounts(): StatusCounts {
  const base = { total: 0 } as StatusCounts;
  for (const s of LEAD_STATUSES) base[s] = 0;
  return base;
}

function foldCounts(rows: { status: string; value: number }[]): StatusCounts {
  const counts = emptyCounts();
  for (const { status, value } of rows) {
    if ((LEAD_STATUSES as readonly string[]).includes(status)) {
      counts[status as LeadStatus] = value;
    }
    counts.total += value;
  }
  return counts;
}

/**
 * Dashboard summary for /admin: per-lead-type counts grouped by status, for the
 * three lead tables. One grouped-count query per table (cheap — indexed status).
 * NOT cached (admin-only, must reflect live status changes). Admin-gated.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const [carfax, inquiry, calculator] = await Promise.all([
    db
      .select({ status: schema.carfaxRequests.status, value: count() })
      .from(schema.carfaxRequests)
      .groupBy(schema.carfaxRequests.status),
    db
      .select({ status: schema.inquiries.status, value: count() })
      .from(schema.inquiries)
      .groupBy(schema.inquiries.status),
    db
      .select({ status: schema.calculatorOffers.status, value: count() })
      .from(schema.calculatorOffers)
      .groupBy(schema.calculatorOffers.status),
  ]);

  return {
    carfax: foldCounts(carfax),
    inquiry: foldCounts(inquiry),
    calculator: foldCounts(calculator),
  };
}
