import { headers } from "next/headers";
import { computeImportBreakdown, type ImportCostInputs, MARKETS, RATES_VERIFIED_AT } from "@/data/import-rates";
import { getDb, schema } from "@/lib/db";
import {
  type CalculatorOfferEmailData,
  sendCalculatorOfferNotification,
  sendCalculatorOfferToCustomer,
} from "@/lib/email";
import { normalizePhone } from "@/lib/phone";
import { resolveUsTransport } from "@/lib/us-transport";
import { getCalcConfig, getUsTariffs } from "@/queries/tariffs";
import { calculatorOfferSchema } from "@/schemas/calculator-offer.schema";
import type { ActionResult } from "@/types/action-result.type";

/** "15 751 $" — space-grouped, matching the site's price style. */
function usdStr(n: number): string {
  return `${Math.round(n).toLocaleString("bg-BG").replace(/\s/g, " ")} $`;
}

/** "1 630 €" — EUR-quoted fees are shown unconverted (see ImportCostLine.amountEur). */
function eurStr(n: number): string {
  return `${Math.round(n).toLocaleString("bg-BG").replace(/\s/g, " ")} €`;
}

/**
 * Persists a /kalkulator gated-offer lead and sends the two emails (customer
 * breakdown + internal notification). Mirrors `createInquiry`'s shape: validate
 * (phone re-normalised defensively) → capture IP → insert (required) → email
 * (best-effort, never fails the submission).
 *
 * A plain async function (NOT a `"use server"` action): invoked by the
 * `/api/calculator-offer` route handler so BotID can protect a stable path (the
 * estimator is embedded on many pages and had no single action path). `headers()`
 * still resolves — the call runs inside the route's request scope.
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

  // Transport is ALWAYS derived server-side; the client-sent inland/container are
  // dropped unconditionally. Previously this ran only when both `auction` and
  // `location` were present, so a request that simply omitted `location` slipped
  // past the check and had its own transport figures used verbatim (a $0 — or an
  // arbitrarily large — "оферта" on company letterhead). For kr/ca the fields are
  // unused by the cost model, so they're cleared rather than resolved.
  const rawInputs = data.inputs as ImportCostInputs;
  let computeInputs: ImportCostInputs = { ...rawInputs, usInlandUsd: undefined, usContainerUsd: undefined };

  if (rawInputs.market === "us") {
    const transportError =
      "Не можахме да потвърдим транспортната цена за избраната локация. Моля изберете локация на аукциона и опитайте отново.";
    if (!rawInputs.auction || !rawInputs.location) {
      return { success: false, error: transportError };
    }
    const t = resolveUsTransport(
      {
        auction: rawInputs.auction,
        location: rawInputs.location,
        vehicleType: rawInputs.vehicleType,
      },
      await getUsTariffs(),
    );
    // Fail closed. Zeroing transport here (the old behaviour) emailed the
    // customer a breakdown ~$1 700–3 800 short with a 0 $ transport line and
    // stored that total as the lead — worse than refusing the submission, and
    // the UI itself refuses to show a total in exactly this case.
    if (t.notFound) {
      console.error("[create-calculator-offer] transport unresolved", {
        auction: rawInputs.auction,
        location: rawInputs.location,
      });
      return { success: false, error: transportError };
    }
    computeInputs = { ...computeInputs, usInlandUsd: t.inland, usContainerUsd: t.container };
  }

  const breakdown = computeImportBreakdown(computeInputs, await getCalcConfig());
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
        // The `*_eur` columns store USD (the calculator is USD end-to-end; no
        // schema rename to avoid a migration).
        carPriceEur: data.inputs.priceUsd,
        totalEur: breakdown.totalUsd,
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
    lines: breakdown.lines.map((l) => ({
      label: l.label,
      amount: l.amountEur != null ? eurStr(l.amountEur) : usdStr(l.amountUsd),
    })),
    totalFormatted: usdStr(breakdown.totalUsd),
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
