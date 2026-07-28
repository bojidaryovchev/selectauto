"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Admin-only: change a contract's visible number — for closing a gap left by a
 * deleted entry, or fixing a number typed wrong (owner, 07.2026: renumber the
 * paid 2026-094 down to the freed 2026-093).
 *
 * The number must be free. Already-generated documents are NOT rewritten: they
 * carry their own frozen snapshot (§2), so a notice issued as 2026-094 keeps
 * saying so — the caller is warned in the UI and should regenerate, which adds a
 * new version carrying the new number.
 */
export async function setContractNumber(id: number, newNumber: string): Promise<ActionResult<{ number: string }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Невалиден идентификатор." };

  const number = newNumber?.trim() ?? "";
  if (!/^\d{4}-\d{1,5}$/.test(number)) {
    return { success: false, error: "Номерът трябва да е във формат ГОДИНА-НОМЕР, напр. 2026-093." };
  }

  const db = getDb();

  try {
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
    if (!contract) return { success: false, error: "Договорът не е намерен." };
    if (contract.number === number) return { success: true, data: { number } };

    const [taken] = await db
      .select({ id: schema.contracts.id })
      .from(schema.contracts)
      .where(eq(schema.contracts.number, number));
    if (taken) return { success: false, error: `Номер ${number} вече е зает от друг договор.` };

    const actorId = session.user?.id ?? null;
    await db.transaction(async (tx) => {
      await tx
        .update(schema.contracts)
        .set({ number, updatedBy: actorId, updatedAt: new Date() })
        .where(eq(schema.contracts.id, id));

      // Keep the payment stages' основание in step when it was the default one.
      const oldBasis = `Договор № ${contract.number}`;
      const newBasis = `Договор № ${number}`;
      await tx
        .update(schema.contracts)
        .set({ paymentBasis: contract.paymentBasis === oldBasis ? newBasis : contract.paymentBasis })
        .where(eq(schema.contracts.id, id));

      await tx.insert(schema.contractEvents).values({
        entity: "contract",
        entityId: id,
        action: "updated",
        actorId,
        data: { field: "number", old: contract.number, new: number },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: { number } };
  } catch (error) {
    console.error("[set-contract-number] failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
