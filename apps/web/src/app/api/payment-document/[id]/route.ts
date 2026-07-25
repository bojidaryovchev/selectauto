import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getDocument, isDocumentStorageConfigured } from "@/lib/s3";
import { renderPaymentNoticePdf } from "@/pdf/render";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";

/**
 * GET /api/payment-document/[id] — downloads one generated payment-notice
 * version as PDF. Two sources, in order:
 *
 *  1. The bytes ARCHIVED to S3 at generation time — byte-identical to what the
 *     client originally received, even if the template has since changed.
 *  2. A fresh render from the row's frozen snapshot (§2) — the fallback for
 *     rows generated before/without S3, so a download never 404s on storage.
 *
 * Admin-gated (the proxy doesn't cover /api).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const docId = Number(id);
  if (!Number.isInteger(docId) || docId <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const g = schema.generatedDocuments;
  const [doc] = await getDb().select().from(g).where(eq(g.id, docId));
  if (!doc || doc.kind !== "payment_notice") {
    return new Response("Not found", { status: 404 });
  }

  const snapshot = doc.snapshot as NoticeSnapshot;

  let pdf: Buffer | null = null;
  if (doc.pdfS3Key && isDocumentStorageConfigured()) {
    try {
      pdf = await getDocument(doc.pdfS3Key);
    } catch (error) {
      console.error("[payment-document] archived copy unreadable, re-rendering", error);
    }
  }
  pdf ??= await renderPaymentNoticePdf(snapshot);

  const filename = `izvestie-${snapshot.contractNumber}-${snapshot.stage}-v${doc.version}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
