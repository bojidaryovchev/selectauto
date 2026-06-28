import { NextResponse } from "next/server";
import { createCarfaxRequest } from "@/mutations/carfax";

/**
 * Carfax inquiry endpoint. Replaces the original WordPress
 * `admin-ajax.php?action=sa_send_carfax_request` handler. The persistence +
 * email logic lives in `@/mutations/carfax` (`createCarfaxRequest`); this route
 * is a thin transport: parse the JSON body, capture the client IP, and map the
 * mutation's `{ success, message, status }` result to a JSON response with the
 * same `{ success, message }` shape and status codes the client form expects.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Невалидна заявка." },
      { status: 400 },
    );
  }

  // Client IP, mirroring the original's REMOTE_ADDR capture.
  const userIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  const { success, message, status } = await createCarfaxRequest(body, userIp);
  return NextResponse.json({ success, message }, { status });
}
