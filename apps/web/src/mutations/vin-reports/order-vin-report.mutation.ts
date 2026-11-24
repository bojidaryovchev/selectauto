"use server";

import { LEAD_TYPE_META } from "@/constants/admin";
import { CLAIM_TAKEOVER_MINUTES, VIN_REPORT_PROVIDER_LABEL, VIN_REPORTS_PATH } from "@/constants/vin-reports";
import { getSessionWith } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { orderReport } from "@/lib/vin-report-api";
import { isReportProvider, normalizeVin, type RefusalReason } from "@/lib/vin-report-parse";
import { getVinReportView } from "@/queries/vin-reports";
import type { ActionResult } from "@/types/action-result.type";
import type { VinReportView } from "@/types/vin-report.type";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Buy one Carfax or AutoCheck report through AuctionsAPI — PAID from its balance (/admin/carfax-otcheti).
 *
 * Gated on `reports.order` (admins only, owner 24.11.2026). The gate is the first statement: a server action is a POST
 * anyone who can forge the request may send, and this one spends money.
 *
 * ── The order of operations is the whole design ─────────────────────────────
 *
 *  1. **Validate on the server.** The VIN is normalised and checked, the provider is one of the two, the lead (if any)
 *     still exists. The browser sends nothing else — no price, no URL.
 *
 *  2. **Claim, then call.** A `vin_reports` row is written as 'pending' BEFORE the paid call. The partial UNIQUE index
 *     `vin_reports_pending_ux` (migration 0053) allows one claim per VIN and provider, so a double click, or two people
 *     at once, can't buy the same report twice. A claim older than 10 minutes is a call that never came back and may
 *     be taken over.
 *
 *  3. **One call, never repeated.** `pdf=1` can take 40–60 s; the call gives up at 100 s, inside the page's
 *     `maxDuration` of 120 s. AuctionsAPI answers a duplicate with 409, and the docs say never to send one.
 *
 *  4. **Every outcome is recorded truthfully.**
 *     - A report: the claim becomes it, in one transaction with the audit row („Купен отчет", /admin/dnevnik).
 *     - A refusal (no records, no money, …): AuctionsAPI generated nothing — the claim is released.
 *     - No answer: the report may still be generated AND charged. The claim stays 'pending' and is logged
 *       („Покупка без отговор"); the history import (lib/vin-report-history.ts) completes it when the report appears,
 *       and the admin is told not to buy again before then.
 */

export type OrderVinReportInput = {
  vin: string;
  provider: string;
  /** The Carfax lead the report is for (/admin/carfax → „Проверете и купете"), if any. */
  carfaxRequestId?: number | null;
};

export type OrderVinReportResult = {
  report: VinReportView | null;
  htmlUrl: string;
  pdfUrl: string | null;
  balanceAfterUsd: number | null;
  /** How many reports the remaining balance covers, as AuctionsAPI counts it. */
  balanceAfterReports: number | null;
};

function refusalMessage(reason: RefusalReason, provider: string): string {
  switch (reason) {
    case "no_records":
      return `${provider} няма история за този VIN. Нищо не е таксувано.`;
    case "bad_vin":
      return "AuctionsAPI не приема този VIN. Проверете номера.";
    case "insufficient_funds":
      return "Балансът в AuctionsAPI не стига за този отчет. Нищо не е таксувано — заредете баланса и опитайте отново.";
    case "inactive":
      return "Отчетите не са включени за ключа в AuctionsAPI. Свържете се с AuctionsAPI.";
    case "unauthorized":
      return "AuctionsAPI не прие ключа. Проверете AUCTIONS_API_KEY.";
    case "not_found":
      return `AuctionsAPI не върна отчет ${provider} за този VIN. Проверете баланса горе, преди да опитате отново.`;
    case "in_progress":
      return "Този отчет вече се генерира в AuctionsAPI. Опреснете страницата след около 3 минути — ще се появи в списъка.";
    case "rate_limited":
      return "Твърде много заявки към AuctionsAPI. Опитайте отново след минута.";
    default:
      return "AuctionsAPI отказа покупката. Опитайте отново по-късно.";
  }
}

function revalidate() {
  revalidatePath(VIN_REPORTS_PATH);
  // The Carfax inbox's drawer lists the reports bought for each lead's VIN.
  revalidatePath(LEAD_TYPE_META.carfax.href);
}

export async function orderVinReport(input: OrderVinReportInput): Promise<ActionResult<OrderVinReportResult>> {
  const session = await getSessionWith("reports.order");
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  const actorId = session.user?.id ?? null;

  // 1. Validate.
  const vin = normalizeVin(input?.vin);
  if (!vin) return { success: false, error: "Въведете валиден 17-значен VIN номер (без I, O, Q)." };
  if (!isReportProvider(input?.provider)) return { success: false, error: "Невалиден вид отчет." };
  const provider = input.provider;
  const label = VIN_REPORT_PROVIDER_LABEL[provider];
  if (!process.env.AUCTIONS_API_KEY) {
    return { success: false, error: "Ключът за AuctionsAPI (AUCTIONS_API_KEY) не е зададен." };
  }

  const db = getDb();
  const t = schema.vinReports;

  let carfaxRequestId: number | null = null;
  const leadId = Number(input?.carfaxRequestId);
  if (Number.isInteger(leadId) && leadId > 0) {
    const [lead] = await db
      .select({ id: schema.carfaxRequests.id })
      .from(schema.carfaxRequests)
      .where(eq(schema.carfaxRequests.id, leadId));
    carfaxRequestId = lead?.id ?? null;
  }

  // 2. Claim — atomically, before any money moves.
  const now = new Date();
  const [claim] = await db
    .insert(t)
    .values({
      provider,
      vin,
      status: "pending",
      origin: "admin",
      orderedBy: actorId,
      carfaxRequestId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [t.vin, t.provider],
      targetWhere: sql`status = 'pending'`,
      set: { orderedBy: actorId, carfaxRequestId, createdAt: now, updatedAt: now },
      // A constant, never input: written into the statement as a literal interval.
      setWhere: sql`${t.updatedAt} < now() - ${sql.raw(`interval '${CLAIM_TAKEOVER_MINUTES} minutes'`)}`,
    })
    .returning({ id: t.id });
  if (!claim) {
    return {
      success: false,
      error: `Отчет ${label} за този VIN се купува в момента (от вас или друг потребител). Изчакайте минута и опреснете страницата.`,
    };
  }

  const logFields = { vin, provider, claimId: claim.id, user: session.user?.email ?? null, carfaxRequestId };

  // 3. The one paid call.
  const outcome = await orderReport(vin, provider);

  // 4a. Refused: nothing was generated, so nothing was bought — release the claim.
  if (outcome.kind === "refused") {
    await db.delete(t).where(and(eq(t.id, claim.id), eq(t.status, "pending")));
    console.warn("[vin-reports] purchase refused", { ...logFields, status: outcome.status, detail: outcome.detail });
    return { success: false, error: refusalMessage(outcome.reason, label) };
  }

  // 4b. No answer: it may still be generated and charged — keep the claim, log it, warn.
  if (outcome.kind === "unknown") {
    console.error("[vin-reports] purchase unanswered", { ...logFields, detail: outcome.detail });
    try {
      await db.transaction(async (tx) => {
        // The 10-minute takeover clock starts when the call ended, not when it began.
        await tx
          .update(t)
          .set({ updatedAt: new Date() })
          .where(and(eq(t.id, claim.id), eq(t.status, "pending")));
        await tx.insert(schema.contractEvents).values({
          entity: "vin_report",
          entityId: claim.id,
          action: "purchase_unanswered",
          actorId,
          data: { vin, provider, ...(carfaxRequestId ? { carfaxRequestId } : {}) },
        });
      });
    } catch (error) {
      console.error("[vin-reports] could not record the unanswered purchase", { ...logFields, error });
    }
    revalidate();
    return {
      success: false,
      error:
        "AuctionsAPI не отговори навреме. Отчетът може още да се генерира — ще се появи в списъка до няколко минути, щом AuctionsAPI го покаже. Не купувайте отново преди това.",
    };
  }

  // 4c. Bought: the claim becomes the report, with its audit row.
  const report = outcome.report;
  let rowId = claim.id;
  try {
    rowId = await db.transaction(async (tx) => {
      const values = {
        status: "ready",
        externalId: report.externalId,
        htmlUrl: report.htmlUrl,
        pdfUrl: report.pdfUrl,
        verifiedReal: report.verifiedReal,
        balanceAfterUsd: report.balanceAfterUsd?.toFixed(2) ?? null,
        updatedAt: new Date(),
      };
      // The history import files a report it finds while the claim is pending against the claim itself; it adds a
      // row of its own only for a claim already taken over. In that case keep that row, as bought here.
      const [dupe] = await tx
        .select({ id: t.id })
        .from(t)
        .where(and(eq(t.externalId, report.externalId), ne(t.id, claim.id)));
      let id = claim.id;
      if (dupe) {
        await tx.delete(t).where(eq(t.id, claim.id));
        await tx
          .update(t)
          .set({ ...values, origin: "admin", orderedBy: actorId, carfaxRequestId })
          .where(eq(t.id, dupe.id));
        id = dupe.id;
      } else {
        await tx.update(t).set(values).where(eq(t.id, claim.id));
      }
      await tx.insert(schema.contractEvents).values({
        entity: "vin_report",
        entityId: id,
        action: "purchased",
        actorId,
        // The lead only when there is one: the log would print „Carfax запитване № —" for every other purchase.
        data: {
          vin,
          provider,
          reportId: report.externalId,
          balanceAfterUsd: report.balanceAfterUsd,
          ...(carfaxRequestId ? { carfaxRequestId } : {}),
        },
      });
      return id;
    });
  } catch (error) {
    // Bought and paid, but not written here: say so, with the link, rather than lose it.
    console.error("[vin-reports] bought but not recorded", { ...logFields, reportId: report.externalId, error });
    revalidate();
    return {
      success: false,
      error: `Отчетът е купен (AuctionsAPI № ${report.externalId}), но записът тук не успя. Опреснете страницата — ще се появи в списъка. Отчетът: ${report.htmlUrl}`,
    };
  }

  console.log("[vin-reports] report bought", { ...logFields, reportId: report.externalId, rowId });
  revalidate();
  let view: VinReportView | null = null;
  try {
    view = await getVinReportView(rowId);
  } catch (error) {
    console.error("[vin-reports] could not read the bought report back", { rowId, error });
  }
  return {
    success: true,
    data: {
      report: view,
      htmlUrl: report.htmlUrl,
      pdfUrl: report.pdfUrl,
      balanceAfterUsd: report.balanceAfterUsd,
      balanceAfterReports: report.balanceAfterReports,
    },
  };
}
