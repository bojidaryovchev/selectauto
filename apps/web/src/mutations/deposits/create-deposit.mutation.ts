"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { centsToDb, parseAmountToCents } from "@/lib/money";
import { createDepositSchema } from "@/schemas/deposit.schema";
import type { ActionResult } from "@/types/action-result.type";

function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

/**
 * Admin-only: create a deposit contract (spec §14). One transaction: resolve or
 * create the client, mint the number from the INDEPENDENT 'deposit' series
 * ("Депозит № 2026-047"), insert the row with a frozen client snapshot in
 * status 'draft', and append the audit events. The lifecycle then runs through
 * updateDepositStatus; 'used' is set only by contract creation (§14.3).
 */
export async function createDeposit(input: unknown): Promise<ActionResult<{ id: number; number: string }>> {
  // Creating is allowed for „Наблюдаващ" too; the status lifecycle
  // (update-deposit-status) stays admin-only.
  const session = await getBackOfficeSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const parsed = createDepositSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалидни данни във формата." };
  }
  const values = parsed.data;
  const actorId = session.user?.id ?? null;

  const depositDate = values.depositDate || todaySofia();
  const year = Number(depositDate.slice(0, 4));
  const depositCents = parseAmountToCents(values.depositAmount)!;
  const budgetCents = values.budgetAmount?.trim() ? parseAmountToCents(values.budgetAmount) : null;

  const db = getDb();

  try {
    const created = await db.transaction(async (tx) => {
      let clientRow: typeof schema.clients.$inferSelect;
      if (values.clientId) {
        const [existing] = await tx.select().from(schema.clients).where(eq(schema.clients.id, values.clientId));
        if (!existing) throw new Error("BG:Избраният клиент не е намерен.");
        clientRow = existing;
      } else {
        const nc = values.newClient!;
        const [inserted] = await tx
          .insert(schema.clients)
          .values({
            kind: nc.kind,
            name: nc.name,
            egn: nc.egn || null,
            eik: nc.eik || null,
            vatNumber: nc.vatNumber || null,
            address: nc.address || null,
            representative: nc.representative || null,
            phone: nc.phone || null,
            email: nc.email || null,
          })
          .returning();
        clientRow = inserted!;
        await tx.insert(schema.contractEvents).values({
          entity: "client",
          entityId: clientRow.id,
          action: "created",
          actorId,
          data: { name: clientRow.name, kind: clientRow.kind },
        });
      }

      // Skip numbers already in use — the admin can move this counter from
      // /admin/depoziti, and paper deposits may occupy numbers.
      let number = "";
      for (let attempt = 0; attempt < 100 && !number; attempt++) {
        const minted = await tx.execute(
          sql`INSERT INTO contract_counters (series, year, last_no) VALUES ('deposit', ${year}, 1)
              ON CONFLICT (series, year) DO UPDATE SET last_no = contract_counters.last_no + 1
              RETURNING last_no`,
        );
        const lastNo = Number((minted.rows[0] as { last_no: number | string }).last_no);
        const candidate = `${year}-${String(lastNo).padStart(3, "0")}`;
        const [used] = await tx
          .select({ id: schema.depositContracts.id })
          .from(schema.depositContracts)
          .where(eq(schema.depositContracts.number, candidate));
        if (!used) number = candidate;
      }
      if (!number) throw new Error("BG:Не може да се определи свободен номер на депозит.");

      const [deposit] = await tx
        .insert(schema.depositContracts)
        .values({
          number,
          depositDate,
          clientId: clientRow.id,
          clientSnapshot: {
            kind: clientRow.kind,
            name: clientRow.name,
            egn: clientRow.egn,
            eik: clientRow.eik,
            vatNumber: clientRow.vatNumber,
            address: clientRow.address,
            representative: clientRow.representative,
            phone: clientRow.phone,
            email: clientRow.email,
          },
          vehicleDescription: values.vehicleDescription || null,
          budgetAmount: budgetCents !== null ? centsToDb(budgetCents) : null,
          budgetCurrency: values.budgetCurrency,
          depositAmount: centsToDb(depositCents),
          status: "draft",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ id: schema.depositContracts.id, number: schema.depositContracts.number });

      await tx.insert(schema.contractEvents).values({
        entity: "deposit",
        entityId: deposit!.id,
        action: "created",
        actorId,
        data: { number, amount: centsToDb(depositCents), client: clientRow.name },
      });

      return deposit!;
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: { id: created.id, number: created.number } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BG:")) {
      return { success: false, error: error.message.slice(3) };
    }
    console.error("[create-deposit] persist failed", error);
    return { success: false, error: "Възникна грешка при създаването на депозита. Моля опитайте отново." };
  }
}
