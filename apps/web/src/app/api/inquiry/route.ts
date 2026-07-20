import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { createInquiry } from "@/mutations/inquiries";

/**
 * Inquiry endpoint — the `fetch` target for the site-wide "Безплатна консултация"
 * modal. Mirrors the carfax route: a thin transport in front of the `createInquiry`
 * mutation. It exists (rather than the modal calling a server action directly) so
 * BotID has a single, stable path to protect — the modal is mounted globally, so as
 * a server action it POSTed to whatever page it opened on.
 *
 * `checkBotId()` runs first (the client challenge for this path is registered in
 * `src/instrumentation-client.ts`), so bots get 403 before any DB write or email.
 * `createInquiry` reads the client IP from the request headers itself.
 */
export async function POST(request: Request) {
  const { isBot } = await checkBotId();
  if (isBot) {
    return NextResponse.json({ success: false, error: "Достъпът е отказан." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Невалидна заявка." }, { status: 400 });
  }

  const result = await createInquiry(body);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
