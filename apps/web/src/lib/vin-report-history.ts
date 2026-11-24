import { getDb, schema } from "@/lib/db";
import { fetchReportHistoryPage } from "@/lib/vin-report-api";
import { collectMissingHistory, type HistoryItem, reportMatchesClaim } from "@/lib/vin-report-parse";
import { and, eq, inArray } from "drizzle-orm";
import "server-only";

/**
 * Bring `vin_reports` in step with AuctionsAPI's report history (GET /reports/my-history, free): every report the key
 * bought, wherever — the admin, or outside it with the same key, which is how all 68 reports before this page were
 * bought (where exactly — AuctionsAPI's site, a bot — the history doesn't say).
 *
 * A report the history has and we don't is either
 * - the one a still-'pending' claim was waiting for (the purchase call timed out but AuctionsAPI finished it): the
 *   claim is completed with it, so the report keeps who bought it and for which lead; or
 * - bought elsewhere: added with origin 'auctionsapi'.
 *
 * Everything found is written in ONE transaction, so an import is all or nothing — what lets the walk stop at the
 * first page with nothing new (lib/vin-report-parse.ts, `collectMissingHistory`). Two imports at once can't add a
 * report twice: `external_id` is UNIQUE and the insert skips a conflict.
 *
 * Runs while /admin/carfax-otcheti renders (two free requests when in step), and after the Carfax inbox has rendered
 * (`after()`, at most every 10 minutes an instance), so its drawer shows reports bought elsewhere too.
 */

let lastRunAt = 0;

export type HistorySyncResult = { imported: number; adopted: number; complete: boolean } | { skipped: true };

export async function syncVinReportHistory(options: { minIntervalMs?: number } = {}): Promise<HistorySyncResult> {
  const now = Date.now();
  if (options.minIntervalMs && now - lastRunAt < options.minIntervalMs) return { skipped: true };
  lastRunAt = now;

  const db = getDb();
  const t = schema.vinReports;

  const { items, complete } = await collectMissingHistory({
    fetchPage: fetchReportHistoryPage,
    knownIds: async (ids) => {
      const rows = await db.select({ id: t.externalId }).from(t).where(inArray(t.externalId, ids));
      return new Set(rows.map((row) => row.id).filter((id): id is number => id !== null));
    },
  });
  if (items.length === 0) return { imported: 0, adopted: 0, complete };

  let imported = 0;
  let adopted = 0;
  await db.transaction(async (tx) => {
    const claims = await tx
      .select({ id: t.id, vin: t.vin, provider: t.provider, createdAt: t.createdAt })
      .from(t)
      .where(and(eq(t.status, "pending"), inArray(t.vin, [...new Set(items.map((i) => i.vin))])));

    const fresh: HistoryItem[] = [];
    for (const item of items) {
      const claim = claims.find((c) => reportMatchesClaim(item, c));
      if (claim) {
        const done = await tx
          .update(t)
          .set({
            status: "ready",
            externalId: item.externalId,
            htmlUrl: item.htmlUrl,
            pdfUrl: item.pdfUrl,
            verifiedReal: item.verifiedReal,
            updatedAt: new Date(),
          })
          .where(and(eq(t.id, claim.id), eq(t.status, "pending")))
          .returning({ id: t.id });
        claims.splice(claims.indexOf(claim), 1);
        if (done.length > 0) {
          adopted += 1;
          continue;
        }
      }
      fresh.push(item);
    }

    if (fresh.length > 0) {
      const rows = await tx
        .insert(t)
        .values(
          fresh.map((item) => ({
            provider: item.provider,
            vin: item.vin,
            status: "ready",
            externalId: item.externalId,
            htmlUrl: item.htmlUrl,
            pdfUrl: item.pdfUrl,
            verifiedReal: item.verifiedReal,
            origin: "auctionsapi",
            createdAt: item.createdAt,
            updatedAt: new Date(),
          })),
        )
        .onConflictDoNothing({ target: t.externalId })
        .returning({ id: t.id });
      imported = rows.length;
    }
  });

  console.log("[vin-reports] history import", { imported, adopted, complete });
  return { imported, adopted, complete };
}
