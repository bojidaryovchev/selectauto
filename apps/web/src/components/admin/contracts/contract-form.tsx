"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CLIENT_KIND_META,
  CONTRACT_MARKET_META,
  CONTRACT_MARKETS,
  CONTRACT_STATUS_META,
  CONTRACT_STATUSES,
  type ClientKind,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { formatCents, formatDbAmount, parseAmountToCents } from "@/lib/money";
import { createContract, updateContract } from "@/mutations/contracts";
import type { ClientRow } from "@/queries/clients";
import type { ContractDetail } from "@/queries/contracts";
import type { AvailableDepositRow } from "@/queries/deposits";

/**
 * The mediation-contract form (spec §3): creation wizard on /admin/dogovori/nov
 * (client + car + the five points, live total, optional deposit deduction) and
 * the edit form on the detail page (car/amounts/status only — client and
 * deposit are frozen at creation). Controlled inputs like the other admin
 * forms; the zod schema re-validates server-side.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

const INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const LABEL = "text-sm font-semibold text-ink";

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

  // ── Contract head ──────────────────────────────────────────────────────────
  const [market, setMarket] = useState<ContractMarket>((contract?.market as ContractMarket) ?? "us_ca");
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

  // ── The five points (§3.5) ─────────────────────────────────────────────────
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

  const currency = CONTRACT_MARKET_META[market].currency;
  const totalCents =
    amountCents(amountCar) +
    amountCents(amountTransport) +
    amountCents(amountCustomsVat) +
    amountCents(amountTransportEuBg) +
    amountCents(amountCommission);

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
          paymentBasis,
          depositContractId: clientMode === "existing" ? depositContractId : undefined,
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      {/* ── 1. Тип договор ── */}
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-black text-ink">1. Тип договор</h2>
        {isEdit ? (
          <p className="text-sm text-muted">
            {CONTRACT_MARKET_META[market].label} — валута {currency} (типът не се променя след създаване)
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {CONTRACT_MARKETS.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  market === m ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="market"
                  checked={market === m}
                  onChange={() => setMarket(m)}
                  className="hidden"
                />
                {CONTRACT_MARKET_META[m].label} ({CONTRACT_MARKET_META[m].currency})
              </label>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Дата на договора</label>
            <input
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
              className={INPUT}
            />
            {!isEdit ? <p className="text-xs text-muted">Оставете празно за днешна дата.</p> : null}
          </div>
          {isEdit ? (
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Статус</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)} className={INPUT}>
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CONTRACT_STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── 2. Клиент (create only) ── */}
      {isEdit ? null : (
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
          <h2 className="text-lg font-black text-ink">2. Клиент</h2>
          <div className="flex flex-wrap gap-3">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                clientMode === "existing" ? "border-brand bg-brand/10 text-brand" : "border-line text-muted"
              }`}
            >
              <input
                type="radio"
                checked={clientMode === "existing"}
                onChange={() => setClientMode("existing")}
                className="hidden"
              />
              Съществуващ клиент
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                clientMode === "new" ? "border-brand bg-brand/10 text-brand" : "border-line text-muted"
              }`}
            >
              <input type="radio" checked={clientMode === "new"} onChange={() => setClientMode("new")} className="hidden" />
              Нов клиент
            </label>
          </div>

          {clientMode === "existing" ? (
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Клиент</label>
              <select
                value={clientId ?? ""}
                onChange={(e) => {
                  setClientId(e.target.value ? Number(e.target.value) : undefined);
                  setDepositContractId(undefined);
                }}
                className={INPUT}
              >
                <option value="">— изберете клиент —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.egn ? `(ЕГН ${c.egn})` : c.eik ? `(ЕИК ${c.eik})` : ""}
                  </option>
                ))}
              </select>
              {clientDeposits.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3">
                  <p className="text-sm font-semibold text-ink">
                    Клиентът има платен депозит — да се приспадне от плащане „Кола“?
                  </p>
                  {clientDeposits.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={depositContractId === d.id}
                        onChange={(e) => setDepositContractId(e.target.checked ? d.id : undefined)}
                        className="size-4 accent-brand"
                      />
                      Депозит № {d.number} — {formatDbAmount(d.depositAmount)} {d.budgetCurrency}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Тип клиент</label>
                <select
                  value={clientKind}
                  onChange={(e) => setClientKind(e.target.value as ClientKind)}
                  className={INPUT}
                >
                  {(["individual", "company"] as const).map((k) => (
                    <option key={k} value={k}>
                      {CLIENT_KIND_META[k].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>{clientKind === "individual" ? "Три имена *" : "Име на фирмата *"}</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={INPUT} />
              </div>
              {clientKind === "individual" ? (
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>ЕГН *</label>
                  <input type="text" value={clientEgn} onChange={(e) => setClientEgn(e.target.value)} className={INPUT} />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className={LABEL}>ЕИК *</label>
                    <input type="text" value={clientEik} onChange={(e) => setClientEik(e.target.value)} className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={LABEL}>ДДС номер</label>
                    <input type="text" value={clientVat} onChange={(e) => setClientVat(e.target.value)} className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={LABEL}>Представител</label>
                    <input
                      type="text"
                      value={clientRepresentative}
                      onChange={(e) => setClientRepresentative(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1">
                <label className={LABEL}>{clientKind === "individual" ? "Адрес" : "Адрес на управление"}</label>
                <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Телефон</label>
                <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Имейл</label>
                <input type="text" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={INPUT} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 3. Автомобил ── */}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-black text-ink">{isEdit ? "Автомобил" : "3. Автомобил"}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Година *</label>
            <input type="number" value={carYear} onChange={(e) => setCarYear(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Марка *</label>
            <input type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Модел *</label>
            <input type="text" value={carModel} onChange={(e) => setCarModel(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>VIN</label>
            <input type="text" value={vin} onChange={(e) => setVin(e.target.value)} maxLength={17} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Държава / пазар на покупка</label>
            <input
              type="text"
              value={purchaseMarket}
              onChange={(e) => setPurchaseMarket(e.target.value)}
              placeholder="напр. САЩ"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Търг / платформа</label>
            <input
              type="text"
              value={auctionPlatform}
              onChange={(e) => setAuctionPlatform(e.target.value)}
              placeholder="напр. Copart 46274725"
              className={INPUT}
            />
          </div>
        </div>
      </section>

      {/* ── 4. Финансови точки ── */}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-black text-ink">{isEdit ? "Финансови точки" : "4. Финансови точки"} ({currency})</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Точка 1 — Кола</label>
            <input type="text" value={amountCar} onChange={(e) => setAmountCar(e.target.value)} placeholder="0.00" className={INPUT} />
            {selectedDeposit ? (
              <p className="text-xs font-semibold text-brand">
                − Депозит № {selectedDeposit.number} ({formatDbAmount(selectedDeposit.depositAmount)}) ще се приспадне
                от това плащане.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Точка 2 — Транспорт</label>
            <input
              type="text"
              value={amountTransport}
              onChange={(e) => setAmountTransport(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Точка 3 — Мито и ДДС (може ориентировъчно)</label>
            <input
              type="text"
              value={amountCustomsVat}
              onChange={(e) => setAmountCustomsVat(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Точка 4 — Транспорт Европа → България</label>
            <input
              type="text"
              value={amountTransportEuBg}
              onChange={(e) => setAmountTransportEuBg(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Точка 5 — Комисионна</label>
            <input
              type="text"
              value={amountCommission}
              onChange={(e) => setAmountCommission(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Основание за плащане</label>
            <input
              type="text"
              value={paymentBasis}
              onChange={(e) => setPaymentBasis(e.target.value)}
              placeholder="автоматично: Договор № …"
              className={INPUT}
            />
          </div>
        </div>
        <div className="rounded-lg bg-neutral-50 px-4 py-3 text-sm">
          <span className="font-semibold text-muted">Обща сума: </span>
          <span className="text-lg font-black text-ink">
            {formatCents(totalCents)} {currency}
          </span>
        </div>
      </section>

      {statusMsg.kind === "error" ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">{statusMsg.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-brand px-8 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Запазване…" : isEdit ? "Запази промените" : "Създай договор"}
      </button>
    </form>
  );
}
