import { eq } from "drizzle-orm";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getDocument, isDocumentStorageConfigured } from "@/lib/s3";
import { renderContractPdf, renderPaymentNoticePdf } from "@/pdf/render";
import type { ContractDocSnapshot } from "@/types/contract-snapshot.type";
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
  const session = await getBackOfficeSession();
  if (!session) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const docId = Number(id);
  if (!Number.isInteger(docId) || docId <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const db = getDb();
  const g = schema.generatedDocuments;
  const [doc] = await db.select().from(g).where(eq(g.id, docId));
  // Serves both the payment notices and the contract documents themselves —
  // same versioning, same archive, same access rules.
  if (!doc || (doc.kind !== "payment_notice" && doc.kind !== "contract")) {
    return new Response("Not found", { status: 404 });
  }

  // A „Наблюдаващ" may download notices only for contracts they created.
  if (!isAdmin(session) && doc.contractId) {
    const [contract] = await db
      .select({ createdBy: schema.contracts.createdBy })
      .from(schema.contracts)
      .where(eq(schema.contracts.id, doc.contractId));
    if (contract?.createdBy !== session.user?.id) {
      return new Response("Not found", { status: 404 });
    }
  }

  const isContract = doc.kind === "contract";

  let pdf: Buffer | null = null;
  if (doc.pdfS3Key && isDocumentStorageConfigured()) {
    try {
      pdf = await getDocument(doc.pdfS3Key);
    } catch (error) {
      console.error("[payment-document] archived copy unreadable, re-rendering", error);
    }
  }
  pdf ??= isContract
    ? await renderContractPdf(doc.snapshot as ContractDocSnapshot)
    : await renderPaymentNoticePdf(doc.snapshot as NoticeSnapshot);

  const filename = isContract
    ? `dogovor-${(doc.snapshot as ContractDocSnapshot).number}-v${doc.version}.pdf`
    : `izvestie-${(doc.snapshot as NoticeSnapshot).contractNumber}-${(doc.snapshot as NoticeSnapshot).stage}-v${doc.version}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
