import type { schema } from "@/lib/db";
import { dbToCents } from "@/lib/money";
import type { NoticeLine, NoticeSnapshot, NoticeVariant } from "@/types/notice-snapshot.type";

/**
 * Builds the frozen NoticeSnapshot for a payment notice (spec §6) from live
 * rows. Pure — no I/O; the mutation loads/validates everything and this
 * assembles the exact payload the PDF renders from.
 *
 * Currency logic (§16): us_ca + SelectAuto → USD lines × курс = EUR total;
 * us_ca + partner → USD only; kr → EUR (SelectAuto notices add the лв. row,
 * fixed 1.95583 — kept from the live samples even post-euro-adoption).
 */

export const BGN_PER_EUR = 1.95583;

/** The client snapshot shape frozen on the contract row at creation. */
type ClientSnapshot = {
  kind?: string;
  name?: string;
  egn?: string | null;
  eik?: string | null;
  address?: string | null;
};

export function buildNoticeSnapshot(args: {
  contract: typeof schema.contracts.$inferSelect;
  payment: typeof schema.contractPayments.$inferSelect;
  recipient: typeof schema.paymentRecipients.$inferSelect;
  /** The SelectAuto row — the Издал block on every notice. */
  issuer: typeof schema.paymentRecipients.$inferSelect;
  /** Linked deposit, only when the VEHICLE stage carries a deduction (§14.2). */
  deposit: typeof schema.depositContracts.$inferSelect | null;
  /** Курс USD→EUR — required iff us_ca + SelectAuto (validated by the caller). */
  usdEurRate: number | null;
  /** Today in Europe/Sofia, ISO. */
  noticeDate: string;
  basis: string;
}): NoticeSnapshot {
  const { contract, payment, recipient, issuer, deposit, usdEurRate, noticeDate, basis } = args;

  const isSelectAuto = recipient.kind === "selectauto";
  const variant: NoticeVariant = isSelectAuto ? (contract.market === "us_ca" ? "selectauto_usd" : "selectauto_eur") : "external";

  // Line items: the stage sum, plus the deposit as its own negative line on the
  // vehicle stage (§14.2 — the stored due_amount already nets it out, so the
  // gross line is due + deduction and the deposit line brings it back down).
  const dueCents = dbToCents(payment.dueAmount);
  const depositCents = deposit ? dbToCents(contract.depositDeduction) : 0;
  const stageMainCents = payment.stage === "vehicle" ? dueCents + depositCents : dueCents;

  const description =
    payment.stage === "customs_vat" ? "Мито и ДДС" : `Разходи по договор №${contract.number}`;

  const toEur = (cents: number) => Math.round(cents * (usdEurRate ?? 0));

  const lines: NoticeLine[] = [
    {
      description,
      amountCents: stageMainCents,
      quantity: 1,
      ...(variant === "selectauto_usd" ? { amountEurCents: toEur(stageMainCents) } : {}),
    },
  ];
  if (payment.stage === "vehicle" && deposit && depositCents > 0) {
    lines.push({
      description: `Депозит №${deposit.number}`,
      amountCents: -depositCents,
      quantity: 1,
      ...(variant === "selectauto_usd" ? { amountEurCents: -toEur(depositCents) } : {}),
    });
  }

  // Payable total: EUR for selectauto_usd (converted), contract currency otherwise.
  const totalCents =
    variant === "selectauto_usd" ? lines.reduce((s, l) => s + (l.amountEurCents ?? 0), 0) : lines.reduce((s, l) => s + l.amountCents, 0);

  const clientSnap = (contract.clientSnapshot ?? {}) as ClientSnapshot;
  const isCompany = clientSnap.kind === "company";

  return {
    noticeDate,
    contractNumber: contract.number,
    carTitle: [contract.carYear, contract.carMake, contract.carModel].filter(Boolean).join(" "),
    vin: contract.vin ?? "",
    issuer: {
      name: issuer.name,
      vatNumber: issuer.vatNumber ?? "",
      // ИН = the VAT number without the BG prefix (matches the paper notices).
      companyId: (issuer.vatNumber ?? "").replace(/^BG/i, ""),
      address: issuer.address ?? "",
    },
    client: {
      name: clientSnap.name ?? "",
      egnOrEik: (isCompany ? clientSnap.eik : clientSnap.egn) ?? "",
      isCompany,
      address: clientSnap.address ?? "",
    },
    stage: payment.stage,
    variant,
    currency: contract.currency,
    lines,
    ...(variant === "selectauto_usd" && usdEurRate ? { usdEurRate } : {}),
    totalCents,
    totalCurrencyLabel: variant === "external" ? contract.currency : "евро",
    ...(variant === "selectauto_eur" ? { totalBgnCents: Math.round(totalCents * BGN_PER_EUR) } : {}),
    recipient: {
      name: recipient.name,
      vatNumber: recipient.vatNumber ?? "",
      address: recipient.address ?? "",
      bankName: recipient.bankName ?? "",
      bankAddress: recipient.bankAddress ?? "",
      iban: recipient.iban ?? "",
      swiftBic: recipient.swiftBic ?? "",
      paymentMethod: recipient.paymentMethod ?? "",
      chargesInstruction: recipient.chargesInstruction ?? "",
    },
    basis,
  };
}
