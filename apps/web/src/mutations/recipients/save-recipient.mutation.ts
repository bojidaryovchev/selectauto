"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { recipientSchema } from "@/schemas/recipient.schema";
import type { ActionResult } from "@/types/action-result.type";

export type SaveRecipientInput = {
  /** Present = edit that recipient; absent = create a new one. */
  id?: number;
  values: unknown;
};

/**
 * Admin-only: create or edit a payment recipient (/admin/poluchateli — spec §8).
 * Values are re-validated server-side with the shared zod schema. Guards:
 *
 *  - The SelectAuto row (slug 'selectauto', seeded by migration 0038) is the
 *    fixed issuer/final-payment recipient — its kind can't change, it can't be
 *    deactivated, and a second 'selectauto'-kind recipient can't be created.
 *  - Recipients are never deleted (documents reference them); retire a partner
 *    by unticking "Активен" instead.
 *
 * Every save appends a contract_events audit row (entity 'recipient') in the
 * same transaction, recording the previous + new values (§9).
 */
export async function saveRecipient(input: SaveRecipientInput): Promise<ActionResult<{ id: number }>> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const parsed = recipientSchema.safeParse(input?.values);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Невалидни данни във формата.";
    return { success: false, error: message };
  }
  const values = parsed.data;

  const id = input?.id;
  if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const db = getDb();
  const t = schema.paymentRecipients;
  const actorId = session.user?.id ?? null;

  // Normalise optional empty strings to NULL columns.
  const patch = {
    kind: values.kind,
    name: values.name,
    country: values.country || null,
    address: values.address || null,
    vatNumber: values.vatNumber || null,
    bankName: values.bankName || null,
    bankAddress: values.bankAddress || null,
    iban: values.iban || null,
    swiftBic: values.swiftBic || null,
    currency: values.currency || null,
    chargesInstruction: values.chargesInstruction || null,
    paymentMethod: values.paymentMethod || null,
    active: values.active,
  };

  try {
    if (id === undefined) {
      // The fixed SelectAuto recipient is a singleton (seeded); partners and
      // customs brokers are the only kinds an admin may add.
      if (values.kind === "selectauto") {
        return { success: false, error: "Получателят SelectAuto е фиксиран и не може да се добавя повторно." };
      }

      const newId = await db.transaction(async (tx) => {
        const [row] = await tx.insert(t).values(patch).returning({ id: t.id });
        await tx.insert(schema.contractEvents).values({
          entity: "recipient",
          entityId: row!.id,
          action: "created",
          actorId,
          data: { new: patch },
        });
        return row!.id;
      });

      revalidatePath("/admin", "layout");
      return { success: true, data: { id: newId } };
    }

    const [existing] = await db.select().from(t).where(eq(t.id, id));
    if (!existing) return { success: false, error: "Получателят не е намерен." };

    if (existing.slug === "selectauto") {
      if (values.kind !== "selectauto") {
        return { success: false, error: "Типът на получателя SelectAuto не може да се променя." };
      }
      if (!values.active) {
        return { success: false, error: "Получателят SelectAuto не може да бъде деактивиран." };
      }
    } else if (values.kind === "selectauto") {
      return { success: false, error: "Само фиксираният запис може да бъде от тип SelectAuto." };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(t)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(t.id, id));
      await tx.insert(schema.contractEvents).values({
        entity: "recipient",
        entityId: id,
        action: "updated",
        actorId,
        data: { old: existing, new: patch },
      });
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: { id } };
  } catch (error) {
    console.error("[save-recipient] persist failed", error);
    return { success: false, error: "Възникна грешка при запазването. Моля опитайте отново." };
  }
}
