"use client";

import { ADMIN_INPUT, AdminBanner, adminChipClass } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { AlertIcon, CheckIcon, ChevronDownIcon } from "@/components/icons";
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
import { isIncompleteDate } from "@/lib/incomplete-date";
import { formatCents, formatDbAmount, parseAmountToCents } from "@/lib/money";
import { createContract, updateContract } from "@/mutations/contracts";
import type { ClientRow } from "@/queries/clients";
import type { ContractDetail } from "@/queries/contracts";
import type { AvailableDepositRow } from "@/queries/deposits";
import { createContractSchema, updateContractSchema } from "@/schemas/contract.schema";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

/**
 * The mediation-contract form (spec §3): creation wizard on /admin/dogovori/nov
 * (client + car + the market's пера, live total, optional deposit deduction) and
 * the edit form on the detail page (car/amounts/status only — client and
 * deposit are frozen at creation). Controlled inputs like the other admin
 * forms. Boards `ab-contract-new*`, `ab-contract-edit*`; parity check
 * docs/design/parity/admin-contract-form.md.
 *
 * The form runs the server's own schema first and puts each message under its
 * field (the kit's field error, `noValidate`); the sticky bar keeps the server's
 * refusals (the deposit checks, a taken number…) and a lost connection. The
 * server re-validates everything.
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
  /** The schema's messages by field path („carYear", „newClient.egn" …). */
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  /** The field paths this form shows right now, so an issue without one goes to the bar. */
  function visiblePaths(): Set<string> {
    const paths = ["contractDate", "carYear", "carMake", "carModel", "vin", "purchaseMarket", "auctionPlatform", "paymentBasis"];
    for (const point of marketMeta.points) {
      if (point.foreignCurrency) paths.push("amountCarForeign", "foreignRate");
      else paths.push(point.key);
    }
    if (!isEdit) {
      if (clientMode === "existing") {
        paths.push("clientId");
        if (selectedDeposit && depositCrossCurrency) paths.push("depositDeductionAmount");
      } else {
        paths.push("newClient.name", "newClient.address", "newClient.phone", "newClient.email");
        if (clientKind === "individual") paths.push("newClient.egn");
        else paths.push("newClient.eik", "newClient.vatNumber", "newClient.representative");
      }
    }
    return new Set(paths);
  }

  /** The props tying a control to its error, and its class. */
  function control(path: string, id: string, base = ADMIN_INPUT) {
    const error = errors[path];
    return error
      ? { className: `${base} is-err`, "aria-invalid": true as const, "aria-describedby": `${id}-err` }
      : { className: base };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // A half-typed date reads as empty, which the server would take as today (or, on an edit, keep the old date).
    const dateInput = document.getElementById(fid("date"));
    if (isIncompleteDate(dateInput)) {
      setErrors({ contractDate: "Невалидна дата." });
      setStatusMsg({ kind: "idle" });
      dateInput.focus();
      return;
    }
    const updateInput = {
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
    };
    const createInput = {
      market,
      contractDate,
      clientId: clientMode === "existing" ? clientId : undefined,
      newClient:
        clientMode === "new"
          ? {
              kind: clientKind,
              name: clientName,
              // Only the ids the chosen kind shows: a value typed before switching kinds stays in state, and it was
              // sent and saved (a person with an ЕИК) or refused under a field that isn't on screen.
              egn: clientKind === "individual" ? clientEgn : "",
              eik: clientKind === "company" ? clientEik : "",
              vatNumber: clientKind === "company" ? clientVat : "",
              address: clientAddress,
              representative: clientKind === "company" ? clientRepresentative : "",
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
      depositDeductionAmount: clientMode === "existing" && depositCrossCurrency ? depositDeductionAmount : undefined,
    };

    // The server's own schema, first: each message under its field.
    const parsed = isEdit ? updateContractSchema.safeParse(updateInput) : createContractSchema.safeParse(createInput);
    if (!parsed.success) {
      const shown = visiblePaths();
      const next: Record<string, string> = {};
      let unplaced: string | null = null;
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (shown.has(path)) next[path] ??= issue.message;
        else unplaced ??= issue.message;
      }
      setErrors(next);
      setStatusMsg(unplaced ? { kind: "error", message: unplaced } : { kind: "idle" });
      return;
    }
    setErrors({});

    setBusy(true);
    setStatusMsg({ kind: "idle" });
    try {
      if (isEdit) {
        const result = await updateContract(contract!.id, updateInput);
        if (result.success) {
          router.refresh();
        } else {
          setStatusMsg({ kind: "error", message: result.error });
        }
      } else {
        const result = await createContract(createInput);
        if (result.success) {
          router.push(`/admin/dogovori/${result.data.id}`);
        } else {
          setStatusMsg({ kind: "error", message: result.error });
        }
      }
    } catch {
      setStatusMsg({ kind: "error", message: "Възникна грешка при запис. Моля, опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  /** A select in the kit's wrapper with its chevron. */
  const select = (el: React.ReactNode) => (
    <span className="sa-selw">
      {el}
      <ChevronDownIcon />
    </span>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="ab-form">
      {/* ── 1. Тип договор ── */}
      <section className="sa-pnl ab-fcard">
        <h2>{isEdit ? "Тип договор" : "1. Тип договор"}</h2>
        {isEdit ? (
          <p className="text-sm text-tx2">
            {CONTRACT_MARKET_META[market].label} — валута {currency} (типът не се променя след създаване)
          </p>
        ) : (
          <fieldset className="ab-chiprow m-0 border-0 p-0">
            <legend className="sr-only">Тип договор</legend>
            {/* A choice pill: a real radio, visually hidden (not display:none, so the
                keyboard and screen readers still reach it), with its label as the pill. */}
            {CONTRACT_MARKETS.map((m) => (
              <label key={m} className={adminChipClass(market === m)}>
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
        <div className="ab-g2">
          <Field
            id={fid("date")}
            label="Дата на договора"
            hint={isEdit ? undefined : "Оставете празно за днешна дата."}
            error={errors.contractDate}
          >
            <input
              id={fid("date")}
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
              {...control("contractDate", fid("date"))}
            />
          </Field>
          {isEdit ? (
            <Field id={fid("status")} label="Статус">
              {select(
                <select
                  id={fid("status")}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContractStatus)}
                  className={ADMIN_INPUT}
                >
                  {CONTRACT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CONTRACT_STATUS_META[s].label}
                    </option>
                  ))}
                </select>,
              )}
            </Field>
          ) : null}
        </div>
      </section>

      {/* ── 2. Клиент (create only) ── */}
      {isEdit ? null : (
        <section className="sa-pnl ab-fcard">
          <h2>2. Клиент</h2>
          <fieldset className="ab-chiprow m-0 border-0 p-0">
            <legend className="sr-only">Клиент</legend>
            <label className={adminChipClass(clientMode === "existing")}>
              <input
                type="radio"
                name="clientMode"
                checked={clientMode === "existing"}
                onChange={() => setClientMode("existing")}
                className="sr-only"
              />
              Съществуващ клиент
            </label>
            <label className={adminChipClass(clientMode === "new")}>
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
            <div className="ab-stack">
              <Field id={fid("client")} label="Клиент" error={errors.clientId}>
                {select(
                  <select
                    id={fid("client")}
                    value={clientId ?? ""}
                    onChange={(e) => {
                      setClientId(e.target.value ? Number(e.target.value) : undefined);
                      setDepositContractId(undefined);
                      setDepositDeductionAmount("");
                    }}
                    {...control("clientId", fid("client"))}
                  >
                    <option value="">— изберете клиент —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.egn ? `(ЕГН ${c.egn})` : c.eik ? `(ЕИК ${c.eik})` : ""}
                      </option>
                    ))}
                  </select>,
                )}
              </Field>
              {clientDeposits.length > 0 ? (
                <div className="ab-depo">
                  <p>Клиентът има платен депозит — да се приспадне от плащане „Кола“?</p>
                  {clientDeposits.map((d) => (
                    <label
                      key={d.id}
                      className={`sa-chk has-focus-visible:[&_.sa-box]:outline-2 has-focus-visible:[&_.sa-box]:outline-offset-2 has-focus-visible:[&_.sa-box]:outline-ortx ${depositContractId === d.id ? "is-on" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={depositContractId === d.id}
                        onChange={(e) => {
                          setDepositContractId(e.target.checked ? d.id : undefined);
                          setDepositDeductionAmount("");
                        }}
                      />
                      <span className="sa-box">
                        <CheckIcon />
                      </span>
                      <span>
                        Депозит № {d.number} — {formatDbAmount(d.depositAmount)} {d.budgetCurrency}
                      </span>
                    </label>
                  ))}
                  {selectedDeposit && depositCrossCurrency ? (
                    <Field
                      id={fid("deduction")}
                      label={`Сума за приспадане в ${currency} *`}
                      hint={`Депозитът е в ${depositCurrency}, а договорът — в ${currency}. Въведете равностойността, която се приспада от Точка 1.`}
                      error={errors.depositDeductionAmount}
                    >
                      <input
                        id={fid("deduction")}
                        type="text"
                        inputMode="decimal"
                        value={depositDeductionAmount}
                        onChange={(e) => setDepositDeductionAmount(e.target.value)}
                        placeholder={`равностойност на ${formatDbAmount(selectedDeposit.depositAmount)} ${depositCurrency}`}
                        {...control("depositDeductionAmount", fid("deduction"))}
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="ab-g2">
              <Field id={fid("kind")} label="Тип клиент">
                {select(
                  <select
                    id={fid("kind")}
                    value={clientKind}
                    onChange={(e) => setClientKind(e.target.value as ClientKind)}
                    className={ADMIN_INPUT}
                  >
                    {(["individual", "company"] as const).map((k) => (
                      <option key={k} value={k}>
                        {CLIENT_KIND_META[k].label}
                      </option>
                    ))}
                  </select>,
                )}
              </Field>
              <Field
                id={fid("name")}
                label={clientKind === "individual" ? "Три имена *" : "Име на фирмата *"}
                error={errors["newClient.name"]}
              >
                <input
                  id={fid("name")}
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  {...control("newClient.name", fid("name"))}
                />
              </Field>
              {clientKind === "individual" ? (
                <Field id={fid("egn")} label="ЕГН *" error={errors["newClient.egn"]}>
                  <input
                    id={fid("egn")}
                    type="text"
                    inputMode="numeric"
                    value={clientEgn}
                    onChange={(e) => setClientEgn(e.target.value)}
                    {...control("newClient.egn", fid("egn"))}
                  />
                </Field>
              ) : (
                <>
                  <Field id={fid("eik")} label="ЕИК *" error={errors["newClient.eik"]}>
                    <input
                      id={fid("eik")}
                      type="text"
                      inputMode="numeric"
                      value={clientEik}
                      onChange={(e) => setClientEik(e.target.value)}
                      {...control("newClient.eik", fid("eik"))}
                    />
                  </Field>
                  <Field id={fid("vat")} label="ДДС номер" error={errors["newClient.vatNumber"]}>
                    <input
                      id={fid("vat")}
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={clientVat}
                      onChange={(e) => setClientVat(e.target.value)}
                      {...control("newClient.vatNumber", fid("vat"))}
                    />
                  </Field>
                  <Field id={fid("representative")} label="Представител" error={errors["newClient.representative"]}>
                    <input
                      id={fid("representative")}
                      type="text"
                      value={clientRepresentative}
                      onChange={(e) => setClientRepresentative(e.target.value)}
                      {...control("newClient.representative", fid("representative"))}
                    />
                  </Field>
                </>
              )}
              <Field
                id={fid("address")}
                label={clientKind === "individual" ? "Адрес" : "Адрес на управление"}
                error={errors["newClient.address"]}
              >
                <input
                  id={fid("address")}
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  {...control("newClient.address", fid("address"))}
                />
              </Field>
              <Field id={fid("phone")} label="Телефон" error={errors["newClient.phone"]}>
                <input
                  id={fid("phone")}
                  type="text"
                  inputMode="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  {...control("newClient.phone", fid("phone"))}
                />
              </Field>
              <Field id={fid("email")} label="Имейл" error={errors["newClient.email"]}>
                <input
                  id={fid("email")}
                  type="text"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  {...control("newClient.email", fid("email"))}
                />
              </Field>
            </div>
          )}
        </section>
      )}

      {/* ── 3. Автомобил ── */}
      <section className="sa-pnl ab-fcard">
        <h2>{isEdit ? "Автомобил" : "3. Автомобил"}</h2>
        <div className="ab-g3">
          <Field id={fid("year")} label="Година *" error={errors.carYear}>
            <input
              id={fid("year")}
              type="number"
              inputMode="numeric"
              value={carYear}
              onChange={(e) => setCarYear(e.target.value)}
              {...control("carYear", fid("year"))}
            />
          </Field>
          <Field id={fid("make")} label="Марка *" error={errors.carMake}>
            <input
              id={fid("make")}
              type="text"
              value={carMake}
              onChange={(e) => setCarMake(e.target.value)}
              {...control("carMake", fid("make"))}
            />
          </Field>
          <Field id={fid("model")} label="Модел *" error={errors.carModel}>
            <input
              id={fid("model")}
              type="text"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              {...control("carModel", fid("model"))}
            />
          </Field>
          <Field id={fid("vin")} label="VIN" error={errors.vin}>
            <input
              id={fid("vin")}
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              maxLength={17}
              {...control("vin", fid("vin"))}
            />
          </Field>
          <Field id={fid("purchase-market")} label="Държава / пазар на покупка" error={errors.purchaseMarket}>
            <input
              id={fid("purchase-market")}
              type="text"
              value={purchaseMarket}
              onChange={(e) => setPurchaseMarket(e.target.value)}
              placeholder="напр. САЩ"
              {...control("purchaseMarket", fid("purchase-market"))}
            />
          </Field>
          <Field id={fid("auction")} label="Търг / платформа" error={errors.auctionPlatform}>
            <input
              id={fid("auction")}
              type="text"
              value={auctionPlatform}
              onChange={(e) => setAuctionPlatform(e.target.value)}
              placeholder="напр. Copart 46274725"
              {...control("auctionPlatform", fid("auction"))}
            />
          </Field>
        </div>
      </section>

      {/* ── 4. Финансови точки ── */}
      <section className="sa-pnl ab-fcard">
        <h2>
          {isEdit ? "Финансови точки" : "4. Финансови точки"} ({currency})
        </h2>
        <div className="ab-g2">
          {/* The пера come from the market definition: 5 for САЩ/Корея, 4 for
              Канада (перо 1 in CAD + курс), 3 for Европа. */}
          {marketMeta.points.map((point) => {
            if (point.foreignCurrency) {
              const cadError = errors.amountCarForeign ?? errors.foreignRate;
              const cadId = fid("cad");
              return (
                <div key={point.key} className="ab-fld ab-span2">
                  <p className="sa-lbl">
                    {point.label} — в {point.foreignCurrency}
                  </p>
                  <div className="ab-cad">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Сума в ${point.foreignCurrency}`}
                      value={amountCarForeign}
                      onChange={(e) => setAmountCarForeign(e.target.value)}
                      placeholder={`0.00 ${point.foreignCurrency}`}
                      {...control("amountCarForeign", cadId)}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Курс ${point.foreignCurrency}/EUR`}
                      value={foreignRate}
                      onChange={(e) => setForeignRate(e.target.value)}
                      placeholder={`курс ${point.foreignCurrency}/EUR`}
                      {...control("foreignRate", cadId)}
                    />
                    <p className="ab-derived">= {formatCents(derivedCarCents)} EUR</p>
                  </div>
                  {cadError ? (
                    <span id={`${cadId}-err`} className="sa-err">
                      <AlertIcon />
                      {cadError}
                    </span>
                  ) : null}
                  <p className="ab-hint">
                    Плащането се превежда в {point.foreignCurrency}; евровата равностойност се изчислява по този курс
                    и се записва в договора.
                  </p>
                  {selectedDeposit ? (
                    <p className="ab-hint">
                      <span className="ab-dhint">
                        − Депозит № {selectedDeposit.number} ({depositNote}) ще се приспадне от това плащане.
                      </span>
                    </p>
                  ) : null}
                </div>
              );
            }
            return (
              <Field
                key={point.key}
                id={fid(point.key)}
                label={point.label}
                error={errors[point.key]}
                hint={
                  point.key === "amountCar" && selectedDeposit ? (
                    <span className="ab-dhint">
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
                  {...control(point.key, fid(point.key))}
                />
              </Field>
            );
          })}
          <Field id={fid("basis")} label="Основание за плащане" error={errors.paymentBasis}>
            <input
              id={fid("basis")}
              type="text"
              value={paymentBasis}
              onChange={(e) => setPaymentBasis(e.target.value)}
              placeholder="автоматично: Договор № …"
              {...control("paymentBasis", fid("basis"))}
            />
          </Field>
        </div>
      </section>

      {/* Sticky: on a phone the total and the save button stay in reach while the
          пера are typed, and a server error shows where the eye already is. */}
      <div className="ab-dock ab-dock--stick bottom-[calc(10px+env(safe-area-inset-bottom))]">
        {statusMsg.kind === "error" ? (
          <AdminBanner tone="error" className="ab-al">
            {statusMsg.message}
          </AdminBanner>
        ) : null}
        <div className="ab-dock__r">
          <p className="ab-dock__tot">
            <span>Обща сума:</span>
            <b>
              {formatCents(totalCents)} {currency}
            </b>
          </p>
          <Button type="submit" variant="pri" size="md" disabled={busy} busy={busy}>
            {busy ? "Запазване…" : isEdit ? "Запазете промените" : "Създайте договор"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** A labelled control with its error, then an optional hint line below it. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ab-fld">
      <label htmlFor={id} className="sa-lbl">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-err`} className="sa-err">
          <AlertIcon />
          {error}
        </span>
      ) : null}
      {hint ? <p className="ab-hint">{hint}</p> : null}
    </div>
  );
}
