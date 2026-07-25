import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { getDocumentDownloadUrl, isDocumentStorageConfigured } from "@/lib/s3";

/**
 * GET /api/payment-attachment/[id] — downloads an uploaded proof-of-payment
 * file. Redirects to a short-lived presigned S3 URL rather than streaming the
 * bytes through the function (cheaper, and the bucket stays private — the URL
 * expires in 5 minutes). Admin-gated (the proxy doesn't cover /api).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const a = schema.paymentAttachments;
  const [attachment] = await getDb().select().from(a).where(eq(a.id, attachmentId));
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isDocumentStorageConfigured()) {
    return new NextResponse("Document storage is not configured", { status: 503 });
  }

  const url = await getDocumentDownloadUrl({ key: attachment.s3Key, filename: attachment.filename });
  return NextResponse.redirect(url, { status: 307 });
}
