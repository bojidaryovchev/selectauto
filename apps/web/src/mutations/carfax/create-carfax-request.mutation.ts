import { carfaxRequests } from "@auctions-ingestion/db/schema";
import { getDb } from "@/lib/db";
import { sendCarfaxNotification } from "@/lib/email";
import { carfaxSchema } from "@/schemas/carfax.schema";

/**
 * Core Carfax-inquiry logic: validate → persist (required) → notify
 * (best-effort). Extracted from the `/api/carfax-request` route so the
 * persistence/email lives under `mutations/` alongside the inquiry action, while
 * the route stays a thin transport that maps this result to a JSON response.
 *
 * This is a plain async function (NOT a `"use server"` action): it's invoked by
 * the route handler, which already runs on the server and owns the public
 * `{ success, message }` contract the client form posts to. The `status` field
 * carries the HTTP code the route should return, preserving the original
 * behaviour (422 on validation, 500 on insert failure, 200 on success).
 */
export type CarfaxRequestResult = {
  success: boolean;
  message: string;
  status: number;
};

export async function createCarfaxRequest(
  body: unknown,
  userIp: string | null,
): Promise<CarfaxRequestResult> {
  const parsed = carfaxSchema.safeParse(body);
  if (!parsed.success) {
    // The schema's messages match the original handler: the required-field
    // message for missing name/phone/VIN, and the VIN-format message otherwise.
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Моля попълнете име, телефон и VIN номер.",
      status: 422,
    };
  }

  const data = {
    ...parsed.data,
    vin: parsed.data.vin.toUpperCase(),
  };

  // 1) Persist (required). A failure returns the original "Неуспешен запис".
  let inserted;
  try {
    const rows = await getDb()
      .insert(carfaxRequests)
      .values({
        fullName: data.full_name,
        phone: data.phone,
        email: data.email || null,
        vin: data.vin,
        carMake: data.car_make || null,
        carModel: data.car_model || null,
        message: data.message || null,
        pageUrl: data.page_url || null,
        userIp,
      })
      .returning();
    inserted = rows[0];
  } catch (error) {
    console.error("[carfax-request] insert failed", error);
    return {
      success: false,
      message: "Неуспешен запис. Опитайте отново.",
      status: 500,
    };
  }

  // 2) Notify (best-effort). Never fails the submission.
  try {
    await sendCarfaxNotification({
      fullName: data.full_name,
      phone: data.phone,
      email: data.email,
      vin: data.vin,
      carMake: data.car_make,
      carModel: data.car_model,
      message: data.message,
      pageUrl: data.page_url,
      createdAt: inserted?.createdAt
        ? inserted.createdAt.toISOString()
        : new Date().toISOString(),
    });
  } catch (error) {
    console.error("[carfax-request] notification email failed", error);
  }

  return {
    success: true,
    message: "Запитването е изпратено успешно.",
    status: 200,
  };
}
