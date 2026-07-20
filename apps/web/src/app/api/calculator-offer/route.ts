import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { createCalculatorOffer } from "@/mutations/calculator-offers";

/**
 * Calculator gated-offer endpoint — the `fetch` target for the estimator's lead
 * form. Mirrors the carfax route: a thin transport in front of the
 * `createCalculatorOffer` mutation. It exists (rather than the form calling a server
 * action directly) so BotID has a single, stable path to protect — the estimator is
 * embedded on /kalkulator, the three `vnos-na-koli-ot-*` pages and every
 * /avtomobil/[id], so as a server action it had no single path.
 *
 * `checkBotId()` runs first (challenge registered in `src/instrumentation-client.ts`),
 * so bots get 403 before the DB write and the two outbound emails. The mutation
 * recomputes the breakdown server-side and reads the client IP from request headers.
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

  const result = await createCalculatorOffer(body);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
