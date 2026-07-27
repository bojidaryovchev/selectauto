import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getBackOfficeSession, isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getDocumentDownloadUrl, isDocumentStorageConfigured } from "@/lib/s3";

/**
 * GET /api/payment-attachment/[id] — downloads an uploaded proof-of-payment
 * file. Redirects to a short-lived presigned S3 URL rather than streaming the
 * bytes through the function (cheaper, and the bucket stays private — the URL
 * expires in 5 minutes). Admin-gated (the proxy doesn't cover /api).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBackOfficeSession();
  if (!session) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const db = getDb();
  const a = schema.paymentAttachments;
  const [attachment] = await db.select().from(a).where(eq(a.id, attachmentId));
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  // A „Наблюдаващ" may download attachments only for their own contracts.
  if (!isAdmin(session)) {
    const [row] = await db
      .select({ createdBy: schema.contracts.createdBy })
      .from(schema.contractPayments)
      .innerJoin(schema.contracts, eq(schema.contracts.id, schema.contractPayments.contractId))
      .where(eq(schema.contractPayments.id, attachment.paymentId));
    if (row?.createdBy !== session.user?.id) {
      return new NextResponse("Not found", { status: 404 });
    }
  }
  if (!isDocumentStorageConfigured()) {
    return new NextResponse("Document storage is not configured", { status: 503 });
  }

  const url = await getDocumentDownloadUrl({ key: attachment.s3Key, filename: attachment.filename });
  return NextResponse.redirect(url, { status: 307 });
}
