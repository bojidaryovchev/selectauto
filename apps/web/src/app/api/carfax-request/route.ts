import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { createCarfaxRequest } from "@/mutations/carfax";

/**
 * Carfax inquiry endpoint. The persistence + email logic lives in
 * `@/mutations/carfax` (`createCarfaxRequest`); this route
 * is a thin transport: parse the JSON body, capture the client IP, and map the
 * mutation's `{ success, message, status }` result to a JSON response with the
 * same `{ success, message }` shape and status codes the client form expects.
 *
 * BotID (Vercel Bot Management) guards this route: `checkBotId()` verifies the
 * invisible-CAPTCHA proof attached by the client challenge (registered in
 * `src/instrumentation-client.ts`) and 403s bots before any DB write or email.
 */
export async function POST(request: Request) {
  const { isBot } = await checkBotId();
  if (isBot) {
    return NextResponse.json(
      { success: false, message: "Достъпът е отказан." },
      { status: 403 },
    );
  }

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
