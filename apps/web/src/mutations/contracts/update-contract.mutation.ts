"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { centsToDb, dbToCents, parseAmountToCents } from "@/lib/money";
import { updateContractSchema } from "@/schemas/contract.schema";
import type { ActionResult } from "@/types/action-result.type";

function cents(value: string | undefined): number {
  if (!value || !value.trim()) return 0;
  return parseAmountToCents(value) ?? 0;
}

/**
 * Admin-only: edit a mediation contract (car data, dates, the five amounts,
 * основание, lifecycle status). What an edit does and does NOT touch:
 *
 *  - The client and the applied deposit are frozen at creation.
 *  - Already GENERATED documents are never altered (§2) — they carry their own
 *    snapshot; a regeneration after the edit produces a new version.
 *  - The four stage `due_amount`s are re-synced from the new points, EXCEPT
 *    stages already 'paid' or 'cancelled' (their history stays as recorded).
 *    The vehicle stage keeps subtracting the original deposit deduction.
 *
 * The old row + patch land in the audit trail (§9).
 */
export async function updateContract(id: number, input: unknown): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }
  const parsed = updateContractSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалидни данни във формата." };
  }
  const values = parsed.data;
  const actorId = session.user?.id ?? null;

  const amounts = {
    car: cents(values.amountCar),
    transport: cents(values.amountTransport),
    customsVat: cents(values.amountCustomsVat),
    transportEuBg: cents(values.amountTransportEuBg),
    commission: cents(values.amountCommission),
  };
  const totalCents = amounts.car + amounts.transport + amounts.customsVat + amounts.transportEuBg + amounts.commission;

  const db = getDb();
  const c = schema.contracts;

  try {
    const [existing] = await db.select().from(c).where(eq(c.id, id));
    if (!existing) return { success: false, error: "Договорът не е намерен." };

    const patch = {
      contractDate: values.contractDate || existing.contractDate,
      carYear: values.carYear,
      carMake: values.carMake,
      carModel: values.carModel,
      vin: values.vin || null,
      purchaseMarket: values.purchaseMarket || null,
      auctionPlatform: values.auctionPlatform || null,
      amountCar: centsToDb(amounts.car),
      amountTransport: centsToDb(amounts.transport),
      amountCustomsVat: centsToDb(amounts.customsVat),
      amountTransportEuBg: centsToDb(amounts.transportEuBg),
      amountCommission: centsToDb(amounts.commission),
      totalAmount: centsToDb(totalCents),
      paymentBasis: values.paymentBasis?.trim() || existing.paymentBasis,
      status: values.status,
    };

    await db.transaction(async (tx) => {
      await tx
        .update(c)
        .set({ ...patch, updatedBy: actorId, updatedAt: new Date() })
        .where(eq(c.id, id));

      // Re-sync due amounts on stages that are still payable (not paid/cancelled).
      const depositDeductionCents = dbToCents(existing.depositDeduction);
      const dueByStage = {
        vehicle: Math.max(0, amounts.car - depositDeductionCents),
        transport: amounts.transport,
        customs_vat: amounts.customsVat,
        final: amounts.transportEuBg + amounts.commission,
      } as const;
      const p = schema.contractPayments;
      for (const [stage, due] of Object.entries(dueByStage)) {
        await tx
          .update(p)
          .set({ dueAmount: centsToDb(due), updatedAt: new Date() })
          .where(and(eq(p.contractId, id), eq(p.stage, stage), notInArray(p.status, ["paid", "cancelled"])));
      }

      await tx.insert(schema.contractEvents).values({
        entity: "contract",
        entityId: id,
        action: existing.status === values.status ? "updated" : "status_changed",
        actorId,
        data: {
          old: {
            contractDate: existing.contractDate,
            carYear: existing.carYear,
            carMake: existing.carMake,
            carModel: existing.carModel,
            vin: existing.vin,
            purchaseMarket: existing.purchaseMarket,
            auctionPlatform: existing.auctionPlatform,
            amountCar: existing.amountCar,
            amountTransport: existing.amountTransport,
            amountCustomsVat: existing.amountCustomsVat,
            amountTransportEuBg: existing.amountTransportEuBg,
            amountCommission: existing.amountCommission,
            totalAmount: existing.totalAmount,
            paymentBasis: existing.paymentBasis,
            status: existing.status,
          },
          new: patch,
        },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[update-contract] persist failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
