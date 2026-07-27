"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { isDocumentStorageConfigured, putDocument } from "@/lib/s3";
import type { ActionResult } from "@/types/action-result.type";

/** Accepted proof-of-payment formats — a bank PDF or a photo/scan of a slip. */
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // matches serverActions.bodySizeLimit in next.config

/** Strips path/odd characters so the stored name is safe in headers and keys. */
function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[\\/]/g, "_")
      .replace(/[^\p{L}\p{N}._-]+/gu, "_")
      .slice(-120) || "document"
  );
}

/**
 * Admin-only: attach a proof-of-payment document to a payment stage (spec §4.3
 * „прикачване на платежен документ“). Takes multipart FormData (`paymentId` +
 * `file`) because a server action can't receive a File any other way.
 *
 * The binary goes to the private documents bucket; the row records the key +
 * metadata. Unlike the notice PDFs (which can always be re-rendered from their
 * snapshot), an uploaded file exists ONLY in S3 — so here the upload must
 * succeed before the DB row is written, and a missing storage config is a hard
 * error rather than a silent skip.
 *
 * A „Наблюдаващ" MAY attach payment documents (owner, 07.2026 — "няма право да
 * генерира платежно и да отбелязва статут на плащането, но да може да прикача
 * платежни към известието"), but only on contracts they created.
 */
export async function addPaymentAttachment(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const session = await getBackOfficeSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  if (!isDocumentStorageConfigured()) {
    return {
      success: false,
      error: "Съхранението на документи не е конфигурирано (липсват SA_* променливи). Свържете се с администратор.",
    };
  }

  const paymentId = Number(formData.get("paymentId"));
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { success: false, error: "Невалиден идентификатор." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Изберете файл за прикачване." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: "Файлът е твърде голям (максимум 8 MB)." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: "Допустими формати: PDF, JPG, PNG, WEBP." };
  }

  const db = getDb();
  const actorId = session.user?.id ?? null;

  try {
    const p = schema.contractPayments;
    const [payment] = await db.select().from(p).where(eq(p.id, paymentId));
    if (!payment) return { success: false, error: "Плащането не е намерено." };

    if (!isAdmin(session)) {
      const [contract] = await db
        .select({ createdBy: schema.contracts.createdBy })
        .from(schema.contracts)
        .where(eq(schema.contracts.id, payment.contractId));
      if (contract?.createdBy !== session.user?.id) {
        return { success: false, error: "Нямате достъп до този договор." };
      }
    }

    const filename = sanitizeFilename(file.name);
    // Unique key per upload so nothing is ever overwritten (§9 — attachments
    // are part of the audit record).
    const key = `attachments/${payment.contractId}/${paymentId}/${Date.now()}-${filename}`;
    const body = Buffer.from(await file.arrayBuffer());

    await putDocument({ key, body, contentType: file.type });

    const attachmentId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.paymentAttachments)
        .values({
          paymentId,
          s3Key: key,
          filename,
          contentType: file.type,
          sizeBytes: file.size,
          uploadedBy: actorId,
        })
        .returning({ id: schema.paymentAttachments.id });

      await tx.insert(schema.contractEvents).values({
        entity: "payment",
        entityId: paymentId,
        action: "attachment_added",
        actorId,
        data: { filename, sizeBytes: file.size, contentType: file.type },
      });

      return row!.id;
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: { id: attachmentId } };
  } catch (error) {
    console.error("[add-payment-attachment] failed", error);
    return { success: false, error: "Възникна грешка при прикачването. Моля опитайте отново." };
  }
}
