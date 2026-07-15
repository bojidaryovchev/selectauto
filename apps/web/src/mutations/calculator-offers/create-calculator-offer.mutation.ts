"use server";

import { headers } from "next/headers";
import {
  computeImportBreakdown,
  EUR_BGN,
  MARKETS,
  RATES_VERIFIED_AT,
} from "@/data/import-rates";
import { getDb, schema } from "@/lib/db";
import {
  type CalculatorOfferEmailData,
  sendCalculatorOfferNotification,
  sendCalculatorOfferToCustomer,
} from "@/lib/email";
import { normalizePhone } from "@/lib/phone";
import { calculatorOfferSchema } from "@/schemas/calculator-offer.schema";
import type { ActionResult } from "@/types/action-result.type";

/** "12 345 €" / "24 143 лв." — thin-space grouping, matching the site. */
function eur(n: number): string {
  return `${Math.round(n).toLocaleString("bg-BG").replace(/ /g, " ")} €`;
}
function bgn(n: number): string {
  return `${Math.round(n * EUR_BGN).toLocaleString("bg-BG").replace(/ /g, " ")} лв.`;
}

/**
 * Persists a /kalkulator gated-offer lead and sends the two emails (customer
 * breakdown + internal notification). Mirrors `createInquiry`'s shape: validate
 * (phone re-normalised defensively) → capture IP → insert (required) → email
 * (best-effort, never fails the submission).
 *
 * The breakdown is RECOMPUTED here from the raw inputs via the same pure
 * `computeImportBreakdown` the UI uses — the client sends only inputs, never
 * line items or totals, so the stored/emailed numbers can't be tampered with
 * and always match what the estimator showed.
 */
export async function createCalculatorOffer(input: unknown): Promise<ActionResult> {
  const normalizedInput =
    input && typeof input === "object" && "phone" in input
      ? { ...input, phone: normalizePhone(String((input as { phone: unknown }).phone ?? "")) }
      : input;

  const parsed = calculatorOfferSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Моля въведете име, валиден телефон и имейл.",
    };
  }
  const data = parsed.data;

  const breakdown = computeImportBreakdown(data.inputs);
  const market = MARKETS.find((m) => m.id === data.inputs.market)!;

  const headerStore = await headers();
  const userIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  // 1) Persist (required).
  let inserted;
  try {
    const rows = await getDb()
      .insert(schema.calculatorOffers)
      .values({
        name: data.name,
        phone: data.phone,
        email: data.email,
        market: data.inputs.market,
        carPriceEur: data.inputs.priceEur,
        totalEur: breakdown.totalEur,
        breakdownJson: {
          inputs: data.inputs,
          lines: breakdown.lines,
          ratesVerifiedAt: RATES_VERIFIED_AT,
        },
        pageUrl: data.page_url || null,
        userIp,
      })
      .returning();
    inserted = rows[0];
  } catch (error) {
    console.error("[create-calculator-offer] insert failed", error);
    return {
      success: false,
      error: "Възникна грешка при изпращането. Моля опитайте отново.",
    };
  }

  // 2) Emails (best-effort — the lead is saved; the team follows up regardless).
  const emailData: CalculatorOfferEmailData = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    marketLabel: market.label,
    lines: breakdown.lines.map((l) => ({ label: l.label, amount: eur(l.amountEur) })),
    totalEurFormatted: eur(breakdown.totalEur),
    totalBgnFormatted: bgn(breakdown.totalEur),
    transit: market.transit,
    ratesVerifiedAt: RATES_VERIFIED_AT,
    pageUrl: data.page_url,
    createdAt: inserted?.createdAt
      ? inserted.createdAt.toISOString()
      : new Date().toISOString(),
  };
  try {
    await sendCalculatorOfferToCustomer(emailData);
  } catch (error) {
    console.error("[create-calculator-offer] customer email failed", error);
  }
  try {
    await sendCalculatorOfferNotification(emailData);
  } catch (error) {
    console.error("[create-calculator-offer] notification email failed", error);
  }

  return { success: true, data: undefined };
}
