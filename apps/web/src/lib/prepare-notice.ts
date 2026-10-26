import "server-only";

import { eq } from "drizzle-orm";
import { DEFAULT_PAYMENT_TERM_DAYS, STAGE_ALLOWED_RECIPIENT_KINDS, type PaymentStage } from "@/constants/contracts";
import { getDb, schema } from "@/lib/db";
import { formatCentsDoc, parseAmountToCents } from "@/lib/money";
import { buildNoticeSnapshot } from "@/lib/notice";
import { missingBankFields } from "@/lib/recipient-bank";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";

export type PaymentNoticeInput = {
  paymentId: number;
  recipientId: number;
  /** Курс USD→EUR — REQUIRED iff САЩ contract + SelectAuto recipient (§16). */
  usdEurRate?: string;
  /**
   * An amount typed by the operator, in the notice's first-column currency. It
   * replaces the contract's figure for the stage — required when paying a
   * customs broker from a non-EUR contract, optional elsewhere (owner, 07.2026:
   * the contract sums are estimates). Conversions and the deposit still apply.
   */
  amountOverride?: string;
  /** Per-stage основание override (customs references etc. — §5.3). */
  basis?: string;
  /** Падеж (optional, ISO date). */
  dueDate?: string;
};

export type PreparedNotice = {
  snapshot: NoticeSnapshot;
  contract: typeof schema.contracts.$inferSelect;
  payment: typeof schema.contractPayments.$inferSelect;
  recipient: typeof schema.paymentRecipients.$inferSelect;
  usdEurRate: number | null;
  overrideCents: number | null;
  basis: string;
  dueDate: string;
};

/** Today as YYYY-MM-DD in Europe/Sofia. */
function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Everything a payment notice needs before anything is written: loads the rows,
 * validates the §5/§10/§16 matrix server-side (the UI only hides what's
 * invalid), and freezes the NoticeSnapshot. Shared by the preview and the
 * generation, so the operator previews exactly the document that gets issued.
 *
 *  - recipient kind allowed for the stage; recipient active;
 *  - курс: required positive decimal for САЩ + SelectAuto, FORBIDDEN otherwise;
 *  - recipient bank data complete, else generation blocks with a clear message;
 *  - the total must come out above zero.
 *
 * The caller gates on `notices.generate` first.
 */
export async function prepareNotice(
  input: PaymentNoticeInput,
): Promise<{ ok: true; notice: PreparedNotice } | { ok: false; error: string }> {
  const paymentId = input?.paymentId;
  const recipientId = input?.recipientId;
  if (!Number.isInteger(paymentId) || paymentId <= 0 || !Number.isInteger(recipientId) || recipientId <= 0) {
    return { ok: false, error: "Невалидни данни." };
  }
  const explicitDueDate = input?.dueDate?.trim() || null;
  if (explicitDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(explicitDueDate)) {
    return { ok: false, error: "Невалиден падеж." };
  }

  const db = getDb();

  const [payment] = await db.select().from(schema.contractPayments).where(eq(schema.contractPayments.id, paymentId));
  if (!payment) return { ok: false, error: "Плащането не е намерено." };

  const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, payment.contractId));
  if (!contract) return { ok: false, error: "Договорът не е намерен." };
  if (contract.status === "cancelled") {
    return { ok: false, error: "Договорът е анулиран — известия не се генерират." };
  }

  const r = schema.paymentRecipients;
  const [recipient] = await db.select().from(r).where(eq(r.id, recipientId));
  if (!recipient) return { ok: false, error: "Получателят не е намерен." };
  if (!recipient.active) return { ok: false, error: "Получателят е деактивиран." };

  // §5: recipient kind must be allowed for this stage (hidden in the UI, but
  // enforced here — defence-in-depth).
  const allowedKinds = STAGE_ALLOWED_RECIPIENT_KINDS[payment.stage as PaymentStage];
  if (!allowedKinds || !allowedKinds.includes(recipient.kind as (typeof allowedKinds)[number])) {
    return { ok: false, error: "Този получател не е допустим за този етап на плащане." };
  }

  // §16: курс required iff САЩ + SelectAuto — that's the only case where the
  // operator supplies it per notice. Канада also prints rate columns, but its
  // rate is fixed on the contract at creation, so nothing is entered here.
  const needsRate = contract.market === "us" && recipient.kind === "selectauto";
  let usdEurRate: number | null = null;
  if (needsRate) {
    const raw = input?.usdEurRate?.trim().replace(",", ".") ?? "";
    const rate = Number(raw);
    if (!raw || !Number.isFinite(rate) || rate <= 0 || rate >= 100) {
      return { ok: false, error: "Въведете валиден положителен курс USD/EUR." };
    }
    usdEurRate = Math.round(rate * 1e6) / 1e6;
  } else if (input?.usdEurRate?.trim()) {
    return { ok: false, error: "За този получател не се използва валутен курс." };
  }

  // The operator's typed amount, in the notice's first-column currency. Auto
  // America / Lean Customs are always paid in EUR, so a USD contract MUST state
  // the euro sum.
  const rawOverride = input?.amountOverride?.trim();
  let overrideCents: number | null = null;
  if (rawOverride) {
    overrideCents = parseAmountToCents(rawOverride);
    if (overrideCents === null || overrideCents <= 0) {
      return { ok: false, error: "Невалидна сума." };
    }
  }
  if (recipient.kind === "customs_broker" && contract.currency !== "EUR" && overrideCents === null) {
    return { ok: false, error: `Плащанията към ${recipient.name} са в евро — въведете сумата в евро.` };
  }

  // §10: bank data must be complete before a notice can be generated.
  if (missingBankFields(recipient).length > 0) {
    return {
      ok: false,
      error: `Банковите данни на „${recipient.name}“ са непълни — попълнете ги в Получатели преди генериране.`,
    };
  }

  // The Издал block comes from the fixed SelectAuto row.
  const [issuer] = await db.select().from(r).where(eq(r.slug, "selectauto"));
  if (!issuer) return { ok: false, error: "Липсва конфигурираният получател SelectAuto." };

  // The deposit row, only when the vehicle stage carries a deduction (§14.2).
  const deposit =
    payment.stage === "vehicle" && contract.depositContractId
      ? ((
          await db
            .select()
            .from(schema.depositContracts)
            .where(eq(schema.depositContracts.id, contract.depositContractId))
        )[0] ?? null)
      : null;

  const basis = input?.basis?.trim() || payment.basis || contract.paymentBasis || `Договор № ${contract.number}`;
  const noticeDate = todaySofia();
  const dueDate = explicitDueDate ?? addDays(noticeDate, DEFAULT_PAYMENT_TERM_DAYS);
  const snapshot = buildNoticeSnapshot({
    contract,
    payment,
    recipient,
    issuer,
    deposit,
    usdEurRate,
    overrideCents,
    noticeDate,
    basis,
  });

  // A typed amount below the deposit, or any other combination, must never
  // produce a document that asks the client for nothing (or for less than zero).
  if (snapshot.totalCents <= 0) {
    return {
      ok: false,
      error: `Общата сума за плащане излиза ${formatCentsDoc(snapshot.totalCents)} ${snapshot.totalCurrencyLabel} — проверете сумата.`,
    };
  }

  return { ok: true, notice: { snapshot, contract, payment, recipient, usdEurRate, overrideCents, basis, dueDate } };
}
