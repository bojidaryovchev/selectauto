"use client";

import {
  ADMIN_HINT,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SELECT,
  AdminBanner,
  AdminButton,
  AdminCard,
} from "@/components/admin/ui";
import {
  CLIENT_KIND_META,
  CONTRACT_MARKET_META,
  CONTRACT_MARKETS,
  CONTRACT_STATUS_META,
  CONTRACT_STATUSES,
  type ClientKind,
  type ContractAmountKey,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { formatCents, formatDbAmount, parseAmountToCents } from "@/lib/money";
import { createContract, updateContract } from "@/mutations/contracts";
import type { ClientRow } from "@/queries/clients";
import type { ContractDetail } from "@/queries/contracts";
import type { AvailableDepositRow } from "@/queries/deposits";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

/**
 * The mediation-contract form (spec §3): creation wizard on /admin/dogovori/nov
 * (client + car + the market's пера, live total, optional deposit deduction) and
 * the edit form on the detail page (car/amounts/status only — client and
 * deposit are frozen at creation). Controlled inputs like the other admin
 * forms; the zod schema re-validates server-side.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

function amountCents(v: string): number {
  if (!v.trim()) return 0;
  return parseAmountToCents(v) ?? 0;
}

export function ContractForm({
  clients = [],
  deposits = [],
  contract,
}: {
  /** Existing clients for the picker (create mode). */
  clients?: ClientRow[];
  /** Unused paid deposits (create mode); filtered by the chosen client. */
  deposits?: AvailableDepositRow[];
  /** Present = edit mode for this contract (client/deposit sections hidden). */
  contract?: ContractDetail["contract"];
}) {
  const router = useRouter();
  const isEdit = Boolean(contract);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  // ── Contract head ──────────────────────────────────────────────────────────
  // NB: the `as` cast can't be trusted for a default — read it defensively so an
  // unknown/legacy market value can never index CONTRACT_MARKET_META as undefined.
  const [market, setMarket] = useState<ContractMarket>(
    CONTRACT_MARKETS.includes(contract?.market as ContractMarket) ? (contract!.market as ContractMarket) : "us",
  );
  const [contractDate, setContractDate] = useState(contract?.contractDate ?? "");
  const [status, setStatus] = useState<ContractStatus>((contract?.status as ContractStatus) ?? "active");

  // ── Client (create mode) ───────────────────────────────────────────────────
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length > 0 ? "existing" : "new");
  const [clientId, setClientId] = useState<number | undefined>(undefined);
  const [clientKind, setClientKind] = useState<ClientKind>("individual");
  const [clientName, setClientName] = useState("");
  const [clientEgn, setClientEgn] = useState("");
  const [clientEik, setClientEik] = useState("");
  const [clientVat, setClientVat] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientRepresentative, setClientRepresentative] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // ── Deposit (create mode, §14) ─────────────────────────────────────────────
  const [depositContractId, setDepositContractId] = useState<number | undefined>(undefined);
  /** The deduction in the contract's currency, when the deposit is in another one. */
  const [depositDeductionAmount, setDepositDeductionAmount] = useState("");
  const clientDeposits = useMemo(
    () => (clientMode === "existing" && clientId ? deposits.filter((d) => d.clientId === clientId) : []),
    [clientMode, clientId, deposits],
  );
  const selectedDeposit = clientDeposits.find((d) => d.id === depositContractId);

  // ── Car ────────────────────────────────────────────────────────────────────
  const [carYear, setCarYear] = useState(contract?.carYear ? String(contract.carYear) : "");
  const [carMake, setCarMake] = useState(contract?.carMake ?? "");
  const [carModel, setCarModel] = useState(contract?.carModel ?? "");
  const [vin, setVin] = useState(contract?.vin ?? "");
  const [purchaseMarket, setPurchaseMarket] = useState(contract?.purchaseMarket ?? "");
  const [auctionPlatform, setAuctionPlatform] = useState(contract?.auctionPlatform ?? "");

  // ── Пера — which ones exist depends on the market ──────────────────────────
  const [amountCarForeign, setAmountCarForeign] = useState(
    contract?.amountCarForeign ? formatDbAmount(contract.amountCarForeign) : "",
  );
  const [foreignRate, setForeignRate] = useState(contract?.foreignRate ?? "");
  const [amountCar, setAmountCar] = useState(contract ? formatDbAmount(contract.amountCar) : "");
  const [amountTransport, setAmountTransport] = useState(contract ? formatDbAmount(contract.amountTransport) : "");
  const [amountCustomsVat, setAmountCustomsVat] = useState(contract ? formatDbAmount(contract.amountCustomsVat) : "");
  const [amountTransportEuBg, setAmountTransportEuBg] = useState(
    contract ? formatDbAmount(contract.amountTransportEuBg) : "",
  );
  const [amountCommission, setAmountCommission] = useState(contract ? formatDbAmount(contract.amountCommission) : "");
  const [paymentBasis, setPaymentBasis] = useState(contract?.paymentBasis ?? "");

  const [statusMsg, setStatusMsg] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const marketMeta = CONTRACT_MARKET_META[market];
  const currency = marketMeta.currency;
  // A deposit in another currency (EUR on a САЩ contract in USD) is deducted at
  // the equivalent the operator states — never 1:1.
  const depositCurrency = selectedDeposit ? selectedDeposit.budgetCurrency || "EUR" : null;
  const depositCrossCurrency = depositCurrency !== null && depositCurrency !== currency;
  const depositNote = selectedDeposit
    ? depositCrossCurrency
      ? depositDeductionAmount.trim()
        ? `${depositDeductionAmount.trim()} ${currency} за ${formatDbAmount(selectedDeposit.depositAmount)} ${depositCurrency}`
        : `${formatDbAmount(selectedDeposit.depositAmount)} ${depositCurrency} — въведете равностойността в ${currency}`
      : `${formatDbAmount(selectedDeposit.depositAmount)} ${currency}`
    : "";

  // Канада: перо 1 is typed in CAD and the EUR value is derived (rounded to the
  // whole euro, exactly as the server stores it).
  const rateNumber = Number(foreignRate.replace(",", "."));
  const rateOk = foreignRate.trim() !== "" && rateNumber > 0 && rateNumber < 1000;
  const derivedCarCents = rateOk ? Math.round((amountCents(amountCarForeign) * rateNumber) / 100) * 100 : 0;

  const valueByKey: Record<ContractAmountKey, string> = {
    amountCar,
    amountTransport,
    amountCustomsVat,
    amountTransportEuBg,
    amountCommission,
  };
  const setterByKey: Record<ContractAmountKey, (v: string) => void> = {
    amountCar: setAmountCar,
    amountTransport: setAmountTransport,
    amountCustomsVat: setAmountCustomsVat,
    amountTransportEuBg: setAmountTransportEuBg,
    amountCommission: setAmountCommission,
  };

  const totalCents = marketMeta.points.reduce(
    (sum, p) => sum + (p.foreignCurrency ? derivedCarCents : amountCents(valueByKey[p.key])),
    0,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatusMsg({ kind: "idle" });
    try {
      if (isEdit) {
        const result = await updateContract(contract!.id, {
          contractDate,
          carYear,
          carMake,
          carModel,
          vin,
          purchaseMarket,
          auctionPlatform,
          amountCar,
          amountTransport,
          amountCustomsVat,
          amountTransportEuBg,
          amountCommission,
          amountCarForeign,
          foreignRate,
          paymentBasis,
          status,
        });
        if (result.success) {
          router.refresh();
        } else {
          setStatusMsg({ kind: "error", message: result.error });
        }
      } else {
        const result = await createContract({
          market,
          contractDate,
          clientId: clientMode === "existing" ? clientId : undefined,
          newClient:
            clientMode === "new"
              ? {
                  kind: clientKind,
                  name: clientName,
                  egn: clientEgn,
                  eik: clientEik,
                  vatNumber: clientVat,
                  address: clientAddress,
                  representative: clientRepresentative,
                  phone: clientPhone,
                  email: clientEmail,
                }
              : undefined,
          carYear,
          carMake,
          carModel,
          vin,
          purchaseMarket,
          auctionPlatform,
          amountCar,
          amountTransport,
          amountCustomsVat,
          amountTransportEuBg,
          amountCommission,
          amountCarForeign,
          foreignRate,
          paymentBasis,
          depositContractId: clientMode === "existing" ? depositContractId : undefined,
          depositDeductionAmount:
            clientMode === "existing" && depositCrossCurrency ? depositDeductionAmount : undefined,
        });
        if (result.success) {
          router.push(`/admin/dogovori/${result.data.id}`);
        } else {
          setStatusMsg({ kind: "error", message: result.error });
        }
      }
    } catch {
      setStatusMsg({ kind: "error", message: "Възникна грешка при запис. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  // A choice pill: a real radio, visually hidden (not display:none, so the
  // keyboard and screen readers still reach it), with its label as the pill.
  const choiceClass = (active: boolean) =>
    `flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
      active ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:border-brand/50"
    }`;

  return (
    <form onSubmit={onSubmit} className="@container flex flex-col gap-6">
      {/* ── 1. Тип договор ── */}
      <AdminCard className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-ink">{isEdit ? "Тип договор" : "1. Тип договор"}</h2>
        {isEdit ? (
          <p className="text-sm text-muted">
            {CONTRACT_MARKET_META[market].label} — валута {currency} (типът не се променя след създаване)
          </p>
        ) : (
          <fieldset className="flex min-w-0 flex-wrap gap-2">
            <legend className="sr-only">Тип договор</legend>
            {CONTRACT_MARKETS.map((m) => (
              <label key={m} className={choiceClass(market === m)}>
                <input
                  type="radio"
                  name="market"
                  checked={market === m}
                  onChange={() => setMarket(m)}
                  className="sr-only"
                />
                {CONTRACT_MARKET_META[m].label} ({CONTRACT_MARKET_META[m].currency})
              </label>
            ))}
          </fieldset>
        )}
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field
            id={fid("date")}
            label="Дата на договора"
            hint={isEdit ? undefined : "Оставете празно за днешна дата."}
          >
            <input
              id={fid("date")}
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>
          {isEdit ? (
            <Field id={fid("status")} label="Статус">
              <select
                id={fid("status")}
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className={ADMIN_SELECT}
              >
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CONTRACT_STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      </AdminCard>

      {/* ── 2. Клиент (create only) ── */}
      {isEdit ? null : (
        <AdminCard className="flex flex-col gap-4">
          <h2 className="text-lg font-black text-ink">2. Клиент</h2>
          <fieldset className="flex min-w-0 flex-wrap gap-2">
            <legend className="sr-only">Клиент</legend>
            <label className={choiceClass(clientMode === "existing")}>
              <input
                type="radio"
                name="clientMode"
                checked={clientMode === "existing"}
                onChange={() => setClientMode("existing")}
                className="sr-only"
              />
              Съществуващ клиент
            </label>
            <label className={choiceClass(clientMode === "new")}>
              <input
                type="radio"
                name="clientMode"
                checked={clientMode === "new"}
                onChange={() => setClientMode("new")}
                className="sr-only"
              />
              Нов клиент
            </label>
          </fieldset>

          {clientMode === "existing" ? (
            <div className="flex flex-col gap-3">
              <Field id={fid("client")} label="Клиент">
                <select
                  id={fid("client")}
                  value={clientId ?? ""}
                  onChange={(e) => {
                    setClientId(e.target.value ? Number(e.target.value) : undefined);
                    setDepositContractId(undefined);
                    setDepositDeductionAmount("");
                  }}
                  className={ADMIN_SELECT}
                >
                  <option value="">— изберете клиент —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.egn ? `(ЕГН ${c.egn})` : c.eik ? `(ЕИК ${c.eik})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {clientDeposits.length > 0 ? (
                <div className="flex flex-col gap-1 rounded-lg border border-brand/40 bg-brand/5 p-3">
                  <p className="text-sm font-semibold text-ink">
                    Клиентът има платен депозит — да се приспадне от плащане „Кола“?
                  </p>
                  {clientDeposits.map((d) => (
                    <label key={d.id} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={depositContractId === d.id}
                        onChange={(e) => {
                          setDepositContractId(e.target.checked ? d.id : undefined);
                          setDepositDeductionAmount("");
                        }}
                        className="size-5 shrink-0 accent-brand"
                      />
                      Депозит № {d.number} — {formatDbAmount(d.depositAmount)} {d.budgetCurrency}
                    </label>
                  ))}
                  {selectedDeposit && depositCrossCurrency ? (
                    <Field
                      id={fid("deduction")}
                      label={`Сума за приспадане в ${currency} *`}
                      hint={`Депозитът е в ${depositCurrency}, а договорът — в ${currency}. Въведете равностойността, която се приспада от Точка 1.`}
                    >
                      <input
                        id={fid("deduction")}
                        type="text"
                        inputMode="decimal"
                        value={depositDeductionAmount}
                        onChange={(e) => setDepositDeductionAmount(e.target.value)}
                        placeholder={`равностойност на ${formatDbAmount(selectedDeposit.depositAmount)} ${depositCurrency}`}
                        className={ADMIN_INPUT}
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 @lg:grid-cols-2">
              <Field id={fid("kind")} label="Тип клиент">
                <select
                  id={fid("kind")}
                  value={clientKind}
                  onChange={(e) => setClientKind(e.target.value as ClientKind)}
                  className={ADMIN_SELECT}
                >
                  {(["individual", "company"] as const).map((k) => (
                    <option key={k} value={k}>
                      {CLIENT_KIND_META[k].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={fid("name")} label={clientKind === "individual" ? "Три имена *" : "Име на фирмата *"}>
                <input
                  id={fid("name")}
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </Field>
              {clientKind === "individual" ? (
                <Field id={fid("egn")} label="ЕГН *">
                  <input
                    id={fid("egn")}
                    type="text"
                    inputMode="numeric"
                    value={clientEgn}
                    onChange={(e) => setClientEgn(e.target.value)}
                    className={ADMIN_INPUT}
                  />
                </Field>
              ) : (
                <>
                  <Field id={fid("eik")} label="ЕИК *">
                    <input
                      id={fid("eik")}
                      type="text"
                      inputMode="numeric"
                      value={clientEik}
                      onChange={(e) => setClientEik(e.target.value)}
                      className={ADMIN_INPUT}
                    />
                  </Field>
                  <Field id={fid("vat")} label="ДДС номер">
                    <input
                      id={fid("vat")}
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={clientVat}
                      onChange={(e) => setClientVat(e.target.value)}
                      className={ADMIN_INPUT}
                    />
                  </Field>
                  <Field id={fid("representative")} label="Представител">
                    <input
                      id={fid("representative")}
                      type="text"
                      value={clientRepresentative}
                      onChange={(e) => setClientRepresentative(e.target.value)}
                      className={ADMIN_INPUT}
                    />
                  </Field>
                </>
              )}
              <Field id={fid("address")} label={clientKind === "individual" ? "Адрес" : "Адрес на управление"}>
                <input
                  id={fid("address")}
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </Field>
              <Field id={fid("phone")} label="Телефон">
                <input
                  id={fid("phone")}
                  type="text"
                  inputMode="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </Field>
              <Field id={fid("email")} label="Имейл">
                <input
                  id={fid("email")}
                  type="text"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className={ADMIN_INPUT}
                />
              </Field>
            </div>
          )}
        </AdminCard>
      )}

      {/* ── 3. Автомобил ── */}
      <AdminCard className="flex flex-col gap-4">
        <h2 className="text-lg font-black text-ink">{isEdit ? "Автомобил" : "3. Автомобил"}</h2>
        <div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
          <Field id={fid("year")} label="Година *">
            <input
              id={fid("year")}
              type="number"
              inputMode="numeric"
              value={carYear}
              onChange={(e) => setCarYear(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>
          <Field id={fid("make")} label="Марка *">
            <input
              id={fid("make")}
              type="text"
              value={carMake}
              onChange={(e) => setCarMake(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>
          <Field id={fid("model")} label="Модел *">
            <input
              id={fid("model")}
              type="text"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              className={ADMIN_INPUT}
            />
          </Field>
          <Field id={fid("vin")} label="VIN">
            <input
              id={fid("vin")}
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              maxLength={17}
              className={ADMIN_INPUT}
            />
          </Field>
          <Field id={fid("purchase-market")} label="Държава / пазар на покупка">
            <input
              id={fid("purchase-market")}
              type="text"
              value={purchaseMarket}
              onChange={(e) => setPurchaseMarket(e.target.value)}
              placeholder="напр. САЩ"
              className={ADMIN_INPUT}
            />
          </Field>
          <Field id={fid("auction")} label="Търг / платформа">
            <input
              id={fid("auction")}
              type="text"
              value={auctionPlatform}
              onChange={(e) => setAuctionPlatform(e.target.value)}
              placeholder="напр. Copart 46274725"
              className={ADMIN_INPUT}
            />
          </Field>
        </div>
      </AdminCard>

      {/* ── 4. Финансови точки ── */}
      <AdminCard className="flex flex-col gap-4">
        <h2 className="text-lg font-black text-ink">
          {isEdit ? "Финансови точки" : "4. Финансови точки"} ({currency})
        </h2>
        <div className="grid gap-4 @lg:grid-cols-2">
          {/* The пера come from the market definition: 5 for САЩ/Корея, 4 for
              Канада (перо 1 in CAD + курс), 3 for Европа. */}
          {marketMeta.points.map((point) =>
            point.foreignCurrency ? (
              <div key={point.key} className="flex min-w-0 flex-col gap-1 @lg:col-span-2">
                <p className={ADMIN_LABEL}>
                  {point.label} — в {point.foreignCurrency}
                </p>
                <div className="grid gap-3 @lg:grid-cols-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Сума в ${point.foreignCurrency}`}
                    value={amountCarForeign}
                    onChange={(e) => setAmountCarForeign(e.target.value)}
                    placeholder={`0.00 ${point.foreignCurrency}`}
                    className={ADMIN_INPUT}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Курс ${point.foreignCurrency}/EUR`}
                    value={foreignRate}
                    onChange={(e) => setForeignRate(e.target.value)}
                    placeholder={`курс ${point.foreignCurrency}/EUR`}
                    className={ADMIN_INPUT}
                  />
                  <p className="flex min-h-11 items-center rounded-lg bg-neutral-50 px-3 text-sm font-semibold text-ink">
                    = {formatCents(derivedCarCents)} EUR
                  </p>
                </div>
                <p className={ADMIN_HINT}>
                  Плащането се превежда в {point.foreignCurrency}; евровата равностойност се изчислява по този курс и се
                  записва в договора.
                </p>
                {selectedDeposit ? (
                  <p className="text-xs font-semibold text-brand">
                    − Депозит № {selectedDeposit.number} ({depositNote}) ще се приспадне от това плащане.
                  </p>
                ) : null}
              </div>
            ) : (
              <Field
                key={point.key}
                id={fid(point.key)}
                label={point.label}
                hint={
                  point.key === "amountCar" && selectedDeposit ? (
                    <span className="font-semibold text-brand">
                      − Депозит № {selectedDeposit.number} ({depositNote}) ще се приспадне от това плащане.
                    </span>
                  ) : undefined
                }
              >
                <input
                  id={fid(point.key)}
                  type="text"
                  inputMode="decimal"
                  value={valueByKey[point.key]}
                  onChange={(e) => setterByKey[point.key](e.target.value)}
                  placeholder="0.00"
                  className={ADMIN_INPUT}
                />
              </Field>
            ),
          )}
          <Field id={fid("basis")} label="Основание за плащане">
            <input
              id={fid("basis")}
              type="text"
              value={paymentBasis}
              onChange={(e) => setPaymentBasis(e.target.value)}
              placeholder="автоматично: Договор № …"
              className={ADMIN_INPUT}
            />
          </Field>
        </div>
      </AdminCard>

      {/* Sticky: on a phone the total and the save button stay in reach while the
          пера are typed, and a server error shows where the eye already is. */}
      <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-card backdrop-blur-sm">
        {statusMsg.kind === "error" ? <AdminBanner tone="error">{statusMsg.message}</AdminBanner> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-semibold text-muted">Обща сума: </span>
            <span className="text-lg font-black whitespace-nowrap text-ink">
              {formatCents(totalCents)} {currency}
            </span>
          </p>
          <AdminButton type="submit" variant="primary" size="lg" disabled={busy}>
            {busy ? "Запазване…" : isEdit ? "Запази промените" : "Създай договор"}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}

/** A labelled control with an optional hint line below it. */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
      </label>
      {children}
      {hint ? <p className={ADMIN_HINT}>{hint}</p> : null}
    </div>
  );
}
