"use server";

import { headers } from "next/headers";
import { getDb, schema } from "@/lib/db";
import { sendInquiryNotification } from "@/lib/email";
import { normalizePhone } from "@/lib/phone";
import { inquirySchema } from "@/schemas/inquiry.schema";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Persists a "Безплатна консултация" inquiry from the site-wide modal and sends
 * a best-effort notification email. Replaces the modal's former simulated
 * submit (a `setTimeout` + `console.log`).
 *
 * Mirrors the carfax route handler's shape: validate (the phone is re-normalised
 * defensively in case the client didn't), capture the client IP, insert
 * (required — a failure returns an error), then email (best-effort — logged,
 * never fails the submission). Returns the `ActionResult` discriminated union so
 * the client can branch on `success`.
 */
export async function createInquiry(input: unknown): Promise<ActionResult> {
  // Re-normalise the phone before validating so a raw `08…` from a non-JS
  // client still passes the same `+359…` check the modal applies.
  const normalizedInput =
    input && typeof input === "object" && "phone" in input
      ? { ...input, phone: normalizePhone(String((input as { phone: unknown }).phone ?? "")) }
      : input;

  const parsed = inquirySchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Моля въведете име и валиден телефонен номер.",
    };
  }
  const data = parsed.data;

  // Client IP, mirroring the carfax handler's REMOTE_ADDR capture.
  const headerStore = await headers();
  const userIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  // 1) Persist (required).
  let inserted;
  try {
    const rows = await getDb()
      .insert(schema.inquiries)
      .values({
        name: data.name,
        phone: data.phone,
        specificModel: data.specific_model || null,
        brand: data.brand || null,
        model: data.model || null,
        budget: data.budget || null,
        time: data.time || null,
        finance: data.finance || null,
        pageUrl: data.page_url || null,
        userIp,
      })
      .returning();
    inserted = rows[0];
  } catch (error) {
    console.error("[create-inquiry] insert failed", error);
    return {
      success: false,
      error: "Възникна грешка при изпращането. Моля опитайте отново.",
    };
  }

  // 2) Notify (best-effort). Never fails the submission.
  try {
    await sendInquiryNotification({
      name: data.name,
      phone: data.phone,
      specificModel: data.specific_model,
      brand: data.brand,
      model: data.model,
      budget: data.budget,
      time: data.time,
      finance: data.finance,
      pageUrl: data.page_url,
      createdAt: inserted?.createdAt
        ? inserted.createdAt.toISOString()
        : new Date().toISOString(),
    });
  } catch (error) {
    console.error("[create-inquiry] notification email failed", error);
  }

  return { success: true, data: undefined };
}
