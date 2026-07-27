import type { schema } from "@/lib/db";
import { dbToCents } from "@/lib/money";
import type { NoticeLine, NoticeSnapshot, NoticeVariant } from "@/types/notice-snapshot.type";

/**
 * Builds the frozen NoticeSnapshot for a payment notice (spec §6) from live
 * rows. Pure — no I/O; the mutation loads/validates everything and this
 * assembles the exact payload the PDF renders from.
 *
 * Currency logic (§16): us_ca + SelectAuto → USD lines × курс = EUR total;
 * us_ca + partner → USD only; kr → EUR. The лв. equivalent that appeared on the
 * older samples is deliberately NOT printed — the owner confirmed (07.2026) it
 * no longer serves a purpose now that BG is in the eurozone.
 */

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
  // Two INDEPENDENT choices (owner, 07.2026):
  //  · the bank block — SelectAuto's short form vs an external recipient's full block;
  //  · the rate columns (стойност / курс / стойност евро) — shown for САЩ paid to
  //    SelectAuto (§16.1) AND for the Канада „кола+транспорт" stage, which is
  //    wired to ALCO IMPEX in CAD but carries a euro value in the contract.
  const variant: NoticeVariant = isSelectAuto
    ? usdEurRate !== null
      ? "selectauto_usd"
      : "selectauto_eur"
    : "external";

  // Line items: the stage sum, plus the deposit as its own negative line on the
  // vehicle stage (§14.2 — the stored due_amount already nets it out, so the
  // gross line is due + deduction and the deposit line brings it back down).
  const dueCents = dbToCents(payment.dueAmount);
  const depositCents = deposit ? dbToCents(contract.depositDeduction) : 0;
  const stageMainCents = payment.stage === "vehicle" ? dueCents + depositCents : dueCents;

  const description =
    payment.stage === "customs_vat" ? "Мито и ДДС" : `Разходи по договор №${contract.number}`;

  /**
   * КАНАДА, етап „кола + транспорт": the wire leaves in CAD (to ALCO IMPEX) while
   * the contract's leading value is the euro equivalent, fixed by the rate
   * entered at contract creation. The stage's stored due_amount is the EUR side.
   */
  const canadaFirstStage =
    payment.stage === "vehicle" && Boolean(contract.foreignCurrency) && contract.amountCarForeign !== null;

  const contractRate = contract.foreignRate ? Number(contract.foreignRate) : null;
  /** The rate that drives the three-column table, whichever case we're in. */
  const rate = canadaFirstStage ? contractRate : usdEurRate;
  const showRateColumns = rate !== null && (canadaFirstStage || variant === "selectauto_usd");

  /**
   * Foreign currency → EUR, ROUNDED TO THE WHOLE EURO (owner, 07.2026 — "да се
   * закръгля"; the notice for contract 2026-090 prints 6 245.00 × 0.889 as
   * 5 552.00, not 5 551.81). Applied per line so the printed lines always sum to
   * the printed total.
   */
  const toEur = (cents: number) => Math.round((cents * (rate ?? 0)) / 100) * 100;
  /** …and back, for the deposit line on a Canadian first stage. */
  const toForeign = (eurCents: number) => (rate ? Math.round(eurCents / rate / 100) * 100 : eurCents);

  // First column = what actually leaves the bank: CAD for the Canadian first
  // stage, the contract currency otherwise.
  const mainFirstCol = canadaFirstStage ? dbToCents(contract.amountCarForeign) : stageMainCents;
  const depositFirstCol = canadaFirstStage ? toForeign(depositCents) : depositCents;

  const lines: NoticeLine[] = [
    {
      description,
      amountCents: mainFirstCol,
      quantity: 1,
      ...(showRateColumns
        ? { amountEurCents: canadaFirstStage ? dbToCents(contract.amountCar) : toEur(mainFirstCol) }
        : {}),
    },
  ];
  if (payment.stage === "vehicle" && deposit && depositCents > 0) {
    lines.push({
      description: `Депозит №${deposit.number}`,
      amountCents: -depositFirstCol,
      quantity: 1,
      ...(showRateColumns ? { amountEurCents: canadaFirstStage ? -depositCents : -toEur(depositFirstCol) } : {}),
    });
  }

  /**
   * Payable total = the currency the client actually wires: EUR when paying
   * SelectAuto against a USD contract (§16.1), and the first column otherwise —
   * including Канада, where ALCO IMPEX holds a CAD-only account.
   */
  const totalInEur = variant === "selectauto_usd";
  const totalCents = lines.reduce((s, l) => s + (totalInEur ? (l.amountEurCents ?? 0) : l.amountCents), 0);

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
    showRateColumns,
    // The first column's currency: CAD on a Canadian first stage, else the contract's.
    currency: canadaFirstStage ? (contract.foreignCurrency ?? contract.currency) : contract.currency,
    lines,
    ...(showRateColumns && rate ? { usdEurRate: rate } : {}),
    totalCents,
    totalCurrencyLabel: totalInEur ? "евро" : canadaFirstStage ? (contract.foreignCurrency ?? "") : contract.currency,
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
      routingCode: recipient.routingCode ?? "",
    },
    basis,
  };
}
