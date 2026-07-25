import { and, eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

/**
 * Daily overdue sweep for the contracts module (spec §4.2 „Просрочено“) —
 * invoked by Vercel Cron (see `crons` in apps/web/vercel.json). Flips payment
 * stages that are still 'awaiting_payment' with a падеж (due_date) before
 * today (Europe/Sofia) to 'overdue', and appends one audit event per flip.
 * Stages without a падеж are never touched, so the sweep is a no-op until the
 * operators actually use the field. 'overdue' clears back to
 * 'awaiting_payment' on the next notice generation, or resolves through the
 * normal mark-as-paid flow.
 *
 * Auth: same contract as the other crons — Vercel sends `CRON_SECRET` as a
 * Bearer header; fail closed with 401 when unset. Idempotent by construction
 * (the UPDATE's WHERE excludes already-overdue rows), so double-fires are
 * harmless. `?dryRun=1` reports what WOULD flip without writing.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") !== null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());

  const db = getDb();
  const p = schema.contractPayments;
  const due = and(eq(p.status, "awaiting_payment"), lt(p.dueDate, today));

  if (dryRun) {
    const rows = await db
      .select({ id: p.id, contractId: p.contractId, stage: p.stage, dueDate: p.dueDate })
      .from(p)
      .where(due);
    return NextResponse.json({ dryRun: true, wouldFlip: rows.length, details: rows });
  }

  const flipped = await db.transaction(async (tx) => {
    const rows = await tx
      .update(p)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(due)
      .returning({ id: p.id, contractId: p.contractId, stage: p.stage, dueDate: p.dueDate });

    if (rows.length > 0) {
      await tx.insert(schema.contractEvents).values(
        rows.map((r) => ({
          entity: "payment",
          entityId: r.id,
          action: "status_changed",
          actorId: null,
          data: { old: "awaiting_payment", new: "overdue", dueDate: r.dueDate, by: "cron/overdue-payments" },
        })),
      );
    }
    return rows;
  });

  if (flipped.length > 0) {
    console.log(
      `[overdue-payments] flipped ${flipped.length} stage(s): ${flipped
        .map((r) => `#${r.contractId}/${r.stage} (падеж ${r.dueDate})`)
        .join(", ")}`,
    );
  }
  return NextResponse.json({ flipped: flipped.length });
}
