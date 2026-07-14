import { NextResponse } from "next/server";
import { checkVinRecords, isValidVin } from "@/lib/vin-reports";

/**
 * VIN record-availability endpoint for the /proverka-vin tool. Thin server-side
 * transport in front of the AuctionsAPI FREE `check-records` lookup — its whole
 * reason to exist is to keep the API key server-only (the key must never reach the
 * browser; see `lib/vin-reports.ts`).
 *
 * Only the FREE check is exposed here. The paid report is a manual, lead-gated step
 * (the tool's CTA routes to the Carfax form), so this route can never spend a
 * report credit.
 *
 * Light in-memory rate limit per IP so the key can't be used as a free public
 * VIN-lookup proxy. In-memory is per-instance (fine for this low-value guard); a
 * durable limiter would need a shared store, not warranted here.
 */

const RATE_LIMIT = 12; // requests
const RATE_WINDOW_MS = 60_000; // per minute per IP
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: "Твърде много заявки. Опитай отново след минута." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Невалидна заявка." }, { status: 400 });
  }

  const rawVin = typeof (body as { vin?: unknown })?.vin === "string" ? (body as { vin: string }).vin : "";
  const vin = rawVin.trim().toUpperCase();

  if (!isValidVin(vin)) {
    return NextResponse.json(
      { success: false, message: "Невалиден VIN номер. VIN се състои от 17 символа (без I, O, Q)." },
      { status: 400 },
    );
  }

  try {
    const result = await checkVinRecords(vin);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[vin-check] lookup failed", error);
    return NextResponse.json(
      { success: false, message: "В момента проверката не е достъпна. Опитай отново по-късно." },
      { status: 502 },
    );
  }
}
