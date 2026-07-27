import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CONTACT, SITE_URL } from "@/constants";
import { carListingToView } from "@/lib/car-mapper";
import { getDb, schema } from "@/lib/db";
import { lotCheckSchema, SOURCE_TO_DOMAIN } from "@/schemas/lot-check.schema";

/**
 * Lot-availability lookup for the browser extension (apps/extension). While an
 * agent is on a Copart / IAAI / Encar lot page, the extension asks whether that
 * exact lot is already a listing on selectauto.bg, so it can show a badge + the
 * `/avtomobil/{id}` deep link + a ready Viber message.
 *
 * Read-only and unauthenticated ON PURPOSE: it only ever returns data that is
 * already public on the site (the listing's own page + its catalog-card fields),
 * never PII. A light per-IP rate limit keeps it from being abused as a bulk
 * inventory-scraping proxy, mirroring /api/vin-check.
 *
 * Resolution (verified against live Neon):
 *   1. Find the car via auction_lots (domain_name, lot_number) — the COMPLETE
 *      lot keyspace, so the agent's exact lot resolves even when it isn't the
 *      one representative lot the projection chose for that car. `lot_number`
 *      equals the on-page id for every domain (Copart lot #, IAAI stock #, Encar
 *      car-id); it is NOT external_lot_id (AuctionsAPI's internal id).
 *   2. Decide site status by car_id: in car_listings → "active" (offer Viber);
 *      in car_listings_archived → "past" (sold — show a result, no sales pitch);
 *      in neither → "unlisted" (ingested but not currently surfaced).
 * Display fields come from whichever projection matched, through the SAME
 * `carListingToView` mapper the catalog card uses, so the extension shows byte-
 * identical title/price/mileage to what the customer will see.
 */

const RATE_LIMIT = 30; // requests
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

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = lotCheckSchema.safeParse({
    source: url.searchParams.get("source") ?? undefined,
    lot: url.searchParams.get("lot") ?? undefined,
    vin: url.searchParams.get("vin") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { source, lot, vin } = parsed.data;
  const domain = SOURCE_TO_DOMAIN[source];

  try {
    const db = getDb();

    // 1) Resolve the car via the full lot keyspace. Prefer an active (non-archived)
    //    lot, then the newest row. A lot may have a NULL car_id (link not yet
    //    resolved) — fall through to the VIN fallback in that case.
    const lotRows = await db
      .select({ carId: schema.auctionLots.carId })
      .from(schema.auctionLots)
      .where(and(eq(schema.auctionLots.domainName, domain), eq(schema.auctionLots.lotNumber, lot)))
      .orderBy(asc(schema.auctionLots.archived), desc(schema.auctionLots.id))
      .limit(1);

    let carId = lotRows[0]?.carId ?? null;

    // 1b) VIN fallback for the rare lot whose on-page id doesn't match lot_number
    //     (or that has no car link). VIN lives on cars, not auction_lots.
    if (carId == null && vin) {
      const carRows = await db
        .select({ id: schema.cars.id })
        .from(schema.cars)
        .where(eq(schema.cars.vin, vin))
        .orderBy(desc(schema.cars.id))
        .limit(1);
      carId = carRows[0]?.id ?? null;
    }

    if (carId == null) {
      return NextResponse.json({ ok: true, exists: false });
    }

    // 2) Status + display fields from the projection the site actually shows.
    const [active] = await db
      .select()
      .from(schema.carListings)
      .where(eq(schema.carListings.carId, carId))
      .limit(1);

    let row = active ?? null;
    let isPast = false;
    if (!row) {
      const [past] = await db
        .select()
        .from(schema.carListingsArchived)
        .where(eq(schema.carListingsArchived.carId, carId))
        .limit(1);
      if (past) {
        row = past;
        isPast = true;
      }
    }

    const pageUrl = `${SITE_URL}/avtomobil/${carId}`;

    // Ingested but not currently surfaced on the catalog (e.g. no image / filtered).
    if (!row) {
      return NextResponse.json({
        ok: true,
        exists: true,
        status: "unlisted" as const,
        url: pageUrl,
        phone: CONTACT.phone,
      });
    }

    const view = carListingToView(row, isPast);

    return NextResponse.json({
      ok: true,
      exists: true,
      status: isPast ? ("past" as const) : ("active" as const),
      url: pageUrl,
      title: view.title,
      price: view.price ?? null,
      mileage: view.mileage || null,
      image: view.image ?? null,
      // Raw i.auctionsapi.com fallback for the extension's onError handler — the
      // card image (`view.image`) is a per-source CDN URL that can occasionally
      // fail to load; `image_url` is the reliable AuctionsAPI copy. Sent only when
      // it's actually a different URL than the card image.
      imageFallback: row.imageUrl && row.imageUrl !== view.image ? row.imageUrl : null,
      source: view.source,
      phone: CONTACT.phone,
    });
  } catch (error) {
    console.error("[lot-check] lookup failed", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 502 });
  }
}
