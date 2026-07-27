/**
 * The frozen render payload of a payment notice (известие за плащане), stored
 * verbatim in `generated_documents.snapshot` (spec §2/§6). The PDF is rendered
 * FROM THIS OBJECT ONLY — never from live contract/recipient rows — so a later
 * edit can't change an already generated document, and any version can be
 * re-rendered byte-identical for download. All money values are integer cents
 * in the document's own currency; totals are precomputed at generation time.
 */

export type NoticeVariant =
  /** US/CA contract paid to SelectAuto: USD column + курс + computed EUR (§16.1). */
  | "selectauto_usd"
  /** Plain EUR notice to SelectAuto (Korea contracts). */
  | "selectauto_eur"
  /** External recipient (international partner / customs broker): single-currency. */
  | "external";

export type NoticeLine = {
  description: string;
  /** Line amount in the CONTRACT currency; negative for the deposit deduction (§14.2). */
  amountCents: number;
  quantity: number;
  /** selectauto_usd only: the converted line amount in EUR cents. */
  amountEurCents?: number;
};

export type NoticeSnapshot = {
  /** Notice date, ISO YYYY-MM-DD (formatted DD.MM.YYYY at render). */
  noticeDate: string;
  contractNumber: string;
  /** e.g. "2016 MERCEDES-BENZ GLE 350D 4MATIC" — may be empty. */
  carTitle: string;
  vin: string;
  /** Издал block — SELECTAUTO IMPORT company data at generation time. */
  issuer: { name: string; vatNumber: string; companyId: string; address: string };
  /** Получил block — the client, from the contract's frozen snapshot. */
  client: { name: string; egnOrEik: string; isCompany: boolean; address: string };
  stage: string;
  variant: NoticeVariant;
  /**
   * Independent of `variant`: print the три-колонна таблица
   * (стойност / курс / стойност евро). True for САЩ→SelectAuto and for the
   * Канада „кола+транспорт" stage paid in CAD to ALCO IMPEX.
   */
  showRateColumns?: boolean;
  /** Currency of the FIRST amount column ("USD" | "CAD" | "EUR"). */
  currency: string;
  lines: NoticeLine[];
  /** selectauto_usd only: the applied курс USD→EUR (§16), as entered. */
  usdEurRate?: number;
  /** Grand total in the PAYABLE currency (EUR for selectauto variants, contract currency for external). */
  totalCents: number;
  /** BG label of the payable currency ("евро" | "USD"). */
  totalCurrencyLabel: string;
  /** The recipient/bank block, denormalized at generation (§6.2). */
  recipient: {
    name: string;
    vatNumber: string;
    address: string;
    bankName: string;
    bankAddress: string;
    iban: string;
    swiftBic: string;
    /** "Вид плащане" row (e.g. "BLINK") — SelectAuto variants only. */
    paymentMethod: string;
    /** "Разноски на превода" row — external variant only. */
    chargesInstruction: string;
    /** Extra clearing code for non-SEPA wires (e.g. Canadian routing code). */
    routingCode: string;
  };
  basis: string;
};
