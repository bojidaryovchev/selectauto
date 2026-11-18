/**
 * The frozen render payload of a CONTRACT document — the mediation contract
 * (договор за посредничество, САЩ/Канада/Корея) or the delivery contract
 * (договор за доставка, Европа). Same principle as NoticeSnapshot: the PDF is
 * rendered from this object only, so a contract printed today stays
 * reproducible even after the template or the company data changes.
 */

export type ContractDocKind = "mediation" | "delivery" | "deposit";

export type ContractDocLine = {
  /** "1." … or "2.1." for the delivery contract's sub-points. */
  number: string;
  /** The перо text, without the amount. */
  text: string;
  amountCents: number;
  /** "14 196 (четиринадесет хиляди сто деветдесет и шест) евро". */
  amountInWords: string;
  /** Канада перо 1: the CAD original behind the euro figure. */
  foreign?: { amountCents: number; amountInWords: string; currency: string; rate: string };
  /** Suffix such as "Описаната сума е ориентировъчна…" printed under the line. */
  note?: string;
};

export type ContractDocSnapshot = {
  /**
   * Template revision. Absent on documents generated before 18.11.2026 (revision 1): those re-render exactly as they
   * were signed. Revision 2 carries the owner's fixes (decisions 30–31): no manager ЕГН or home address, SelectAuto's
   * own contacts, „Обща сума" above the signatures, КУПУВАЧ/ДОСТАВЧИК throughout the delivery contract, „българското
   * законодателство", and both parties' e-mail and phone in the deposit contract.
   */
  template?: 2;
  kind: ContractDocKind;
  /** "2026-094". */
  number: string;
  /** ISO; rendered as DD.MM.YYYY. */
  date: string;
  city: string;
  /** The company issuing the contract. */
  company: {
    name: string;
    eik: string;
    address: string;
    manager: string;
    /** Revision 1 only: the manager's ЕГН and home address, printed on the documents signed before 18.11.2026. */
    managerEgn?: string;
    managerAddress?: string;
    bankName: string;
    iban: string;
    email: string;
    phone: string;
  };
  client: {
    name: string;
    /** ЕГН for a person, ЕИК for a company. */
    idNumber: string;
    isCompany: boolean;
    address: string;
    representative: string;
    email: string;
    phone: string;
  };
  car: { title: string; vin: string };
  /** e.g. "Copart.com, iaai.com или encar" — market specific. */
  auctionPlatforms: string;
  /** "в Съединени американски щати" / "" — appended to the услуга sentence. */
  auctionCountry: string;
  lines: ContractDocLine[];
  totalCents: number;
  totalInWords: string;
  currency: string;
  /** Основание printed in the bank paragraph ("Дог.2026-094"). */
  basis: string;
  /** Delivery contract only: where the car is handed over. */
  deliveryAddress: string;
  /** Delivery contract only: the total is quoted "с ДДС". */
  vatIncluded: boolean;
  /** Deposit contract only (чл. 1): the client's budget, digits + words. */
  budgetInWords?: string;
  /** Deposit contract only (чл. 1): "ЛЕК АВТОМОБИЛ" and similar. */
  vehicleDescription?: string;
  /** Deposit contract only: SWIFT + payment method for the payment table. */
  bank?: { swift: string; paymentMethod: string };
};
