"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CONTRACT_MARKET_META, type ContractAmountKey, type ContractMarket } from "@/constants/contracts";
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

  const db = getDb();
  const c = schema.contracts;

  try {
    const [existing] = await db.select().from(c).where(eq(c.id, id));
    if (!existing) return { success: false, error: "Договорът не е намерен." };

    // The market decides which пера exist and how they roll up into stages.
    const market = CONTRACT_MARKET_META[existing.market as ContractMarket];
    if (!market) return { success: false, error: "Непознат тип договор." };

    // Канада: перо 1 stays driven by CAD × rate, so an edit recomputes the euro
    // value rather than trusting the (read-only) EUR box.
    const foreignPoint = market.points.find((p) => p.foreignCurrency);
    const editedRate = values.foreignRate?.trim() ? Number(values.foreignRate.replace(",", ".")) : null;
    const rate = editedRate ?? (existing.foreignRate ? Number(existing.foreignRate) : null);
    const carForeignCents = values.amountCarForeign?.trim()
      ? cents(values.amountCarForeign)
      : dbToCents(existing.amountCarForeign);
    const derivedCarCents =
      foreignPoint && rate && carForeignCents ? Math.round((carForeignCents * rate) / 100) * 100 : null;

    const marketPointKeys = new Set<ContractAmountKey>(market.points.map((p) => p.key));
    const raw: Record<ContractAmountKey, number> = {
      amountCar: derivedCarCents ?? cents(values.amountCar),
      amountTransport: cents(values.amountTransport),
      amountCustomsVat: cents(values.amountCustomsVat),
      amountTransportEuBg: cents(values.amountTransportEuBg),
      amountCommission: cents(values.amountCommission),
    };
    const amounts = Object.fromEntries(
      (Object.keys(raw) as ContractAmountKey[]).map((k) => [k, marketPointKeys.has(k) ? raw[k] : 0]),
    ) as Record<ContractAmountKey, number>;
    const totalCents = market.points.reduce((sum, p) => sum + amounts[p.key], 0);

    const patch = {
      contractDate: values.contractDate || existing.contractDate,
      carYear: values.carYear,
      carMake: values.carMake,
      carModel: values.carModel,
      vin: values.vin || null,
      purchaseMarket: values.purchaseMarket || null,
      auctionPlatform: values.auctionPlatform || null,
      amountCar: centsToDb(amounts.amountCar),
      amountTransport: centsToDb(amounts.amountTransport),
      amountCustomsVat: centsToDb(amounts.amountCustomsVat),
      amountTransportEuBg: centsToDb(amounts.amountTransportEuBg),
      amountCommission: centsToDb(amounts.amountCommission),
      totalAmount: centsToDb(totalCents),
      paymentBasis: values.paymentBasis?.trim() || existing.paymentBasis,
      status: values.status,
      ...(derivedCarCents !== null
        ? { amountCarForeign: centsToDb(carForeignCents), foreignRate: rate ? String(rate) : existing.foreignRate }
        : {}),
    };

    await db.transaction(async (tx) => {
      await tx
        .update(c)
        .set({ ...patch, updatedBy: actorId, updatedAt: new Date() })
        .where(eq(c.id, id));

      // Re-sync due amounts on stages that are still payable (not paid/cancelled).
      const depositDeductionCents = dbToCents(existing.depositDeduction);
      const p = schema.contractPayments;
      for (const def of market.stages) {
        const sum = def.points.reduce((s, key) => s + amounts[key], 0);
        const due = def.stage === "vehicle" ? Math.max(0, sum - depositDeductionCents) : sum;
        await tx
          .update(p)
          .set({ dueAmount: centsToDb(due), updatedAt: new Date() })
          .where(and(eq(p.contractId, id), eq(p.stage, def.stage), notInArray(p.status, ["paid", "cancelled"])));
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
