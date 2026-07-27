import { CONTRACT_MARKET_META, type ContractMarket } from "@/constants/contracts";
import { amountToBgWords, numberToBgWords } from "@/lib/bg-amount-words";
import type { schema } from "@/lib/db";
import { dbToCents } from "@/lib/money";
import type { ContractDocLine, ContractDocSnapshot } from "@/types/contract-snapshot.type";

/**
 * Builds the frozen snapshot a contract PDF renders from. Pure — the caller
 * loads the rows. The company block is the fixed СЕЛЕКТАУТО ИМПОРТ data (the
 * owner confirmed 07.2026 that the old КВ АУТО ГРУП entity is not used for new
 * contracts, including the Европа delivery template).
 */

/** Fixed issuer data as printed on the signed contracts. */
export const CONTRACT_COMPANY = {
  name: "СЕЛЕКТАУТО ИМПОРТ ЕООД",
  eik: "208786079",
  address: "гр. Пловдив, ул. Лазо Войвода 19",
  manager: "Валентин Милков Кичуков",
  managerEgn: "0248084529",
  managerAddress: "гр. Пловдив, ул. Бистрица 15",
  bankName: "ОББ",
  iban: "BG38UBBS80021477259910",
  email: "info.kvgroup888@gmail.com",
  phone: "+359899820982",
} as const;

/** Where the car is handed over — Европа keeps its own address (owner, 07.2026). */
export const DELIVERY_ADDRESS_EU = 'гр. Пловдив, ул. „Ушица Север" № 64А';
export const DELIVERY_ADDRESS_DEFAULT = "гр. Пловдив, ул. Лазо Войвода № 19";

/** The auction platforms named in each market's contract text. */
const AUCTION_PLATFORMS: Record<ContractMarket, string> = {
  us: "Copart.com или iaai.com",
  ca: "Copart.com или iaai.com",
  kr: "Copart.com, iaai.com или encar",
  eu: "Openlane",
};

/** The country phrase in „участие на търг…". */
const AUCTION_COUNTRY: Record<ContractMarket, string> = {
  us: " в Съединени американски щати",
  ca: " в Съединени американски щати",
  kr: "",
  eu: "",
};

type ClientSnapshot = {
  kind?: string;
  name?: string;
  egn?: string | null;
  eik?: string | null;
  address?: string | null;
  representative?: string | null;
  email?: string | null;
  phone?: string | null;
};

/** BG name of the currency as the contracts spell it out. */
const CURRENCY_NOUN: Record<string, string> = {
  EUR: "евро",
  USD: "американски щатски долара",
  CAD: "канадски долара",
};

/**
 * "14 196 (четиринадесет хиляди сто деветдесет и шест) евро" — digits, the same
 * number in words, then the currency ONCE. Whole sums print without decimals,
 * exactly as the signed contracts do.
 */
function withWords(cents: number, currency: string): string {
  const whole = Math.floor(cents / 100);
  const hasFraction = cents % 100 !== 0;
  const digits = hasFraction
    ? (cents / 100).toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : whole.toLocaleString("bg-BG");
  // Gender follows the noun: долар is masculine, евро takes the neuter form.
  const gender = currency === "EUR" ? "neuter" : "masculine";
  const words = hasFraction ? amountToBgWords(cents, currency) : numberToBgWords(whole, gender);
  const noun = CURRENCY_NOUN[currency] ?? currency;
  return hasFraction ? `${digits} (${words})` : `${digits} (${words}) ${noun}`;
}

export function buildContractDocSnapshot(contract: typeof schema.contracts.$inferSelect): ContractDocSnapshot {
  const market = contract.market as ContractMarket;
  const meta = CONTRACT_MARKET_META[market];
  const isDelivery = meta.documentType === "delivery";
  const currency = contract.currency;
  const snap = (contract.clientSnapshot ?? {}) as ClientSnapshot;
  const isCompany = snap.kind === "company";

  // The delivery contract numbers its пера 2 / 2.1 / 2.2; the mediation one 1…5.
  const numbering = isDelivery ? ["2.", "2.1.", "2.2."] : ["1.", "2.", "3.", "4.", "5."];

  const lines: ContractDocLine[] = meta.points.map((point, i) => {
    const cents = dbToCents(contract[point.key]);
    const foreignCents = point.foreignCurrency ? dbToCents(contract.amountCarForeign) : 0;
    return {
      number: numbering[i] ?? `${i + 1}.`,
      text: point.label.replace(/^Точка \d+ — /, ""),
      amountCents: cents,
      amountInWords: withWords(cents, currency),
      ...(point.foreignCurrency && foreignCents > 0
        ? {
            foreign: {
              amountCents: foreignCents,
              amountInWords: withWords(foreignCents, point.foreignCurrency),
              currency: point.foreignCurrency,
              rate: contract.foreignRate ?? "",
            },
          }
        : {}),
      ...(point.key === "amountCustomsVat"
        ? { note: "Описаната сума е ориентировъчна и може да варира в зависимост от митническата оценка на автомобила." }
        : {}),
    };
  });

  const totalCents = dbToCents(contract.totalAmount);

  return {
    kind: meta.documentType,
    number: contract.number,
    date: contract.contractDate,
    city: "Пловдив",
    company: { ...CONTRACT_COMPANY },
    client: {
      name: snap.name ?? "",
      idNumber: (isCompany ? snap.eik : snap.egn) ?? "",
      isCompany,
      address: snap.address ?? "",
      representative: snap.representative ?? "",
      email: snap.email ?? "",
      phone: snap.phone ?? "",
    },
    car: { title: [contract.carYear, contract.carMake, contract.carModel].filter(Boolean).join(" "), vin: contract.vin ?? "" },
    auctionPlatforms: contract.auctionPlatform || AUCTION_PLATFORMS[market],
    auctionCountry: AUCTION_COUNTRY[market],
    lines,
    totalCents,
    totalInWords: withWords(totalCents, currency),
    currency,
    basis: `Дог.${contract.number}`,
    deliveryAddress: isDelivery ? DELIVERY_ADDRESS_EU : DELIVERY_ADDRESS_DEFAULT,
    vatIncluded: isDelivery,
  };
}
