"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLIENT_KIND_META, type ClientKind } from "@/constants/contracts";
import { createDeposit } from "@/mutations/deposits";
import type { ClientRow } from "@/queries/clients";

/**
 * Create form for a deposit contract (/admin/depoziti — spec §14). Mirrors the
 * contract wizard's client section (existing or new client); the amount floor
 * from the template (500 EUR, чл. 3) is a placeholder hint, not a hard rule.
 * The server action mints the independent deposit number series.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

const INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const LABEL = "text-sm font-semibold text-ink";

export function DepositForm({ clients, onDone }: { clients: ClientRow[]; onDone?: () => void }) {
  const router = useRouter();
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length > 0 ? "existing" : "new");
  const [clientId, setClientId] = useState<number | undefined>(undefined);
  const [clientKind, setClientKind] = useState<ClientKind>("individual");
  const [clientName, setClientName] = useState("");
  const [clientEgn, setClientEgn] = useState("");
  const [clientEik, setClientEik] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [depositDate, setDepositDate] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("ЛЕК АВТОМОБИЛ");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<"EUR" | "USD">("EUR");
  const [depositAmount, setDepositAmount] = useState("500");

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await createDeposit({
        clientId: clientMode === "existing" ? clientId : undefined,
        newClient:
          clientMode === "new"
            ? {
                kind: clientKind,
                name: clientName,
                egn: clientEgn,
                eik: clientEik,
                address: clientAddress,
                phone: clientPhone,
                email: clientEmail,
              }
            : undefined,
        depositDate,
        vehicleDescription,
        budgetAmount,
        budgetCurrency,
        depositAmount,
      });
      if (result.success) {
        onDone?.();
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Възникна грешка при запис. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <h3 className="text-lg font-black text-ink">Нов договор за депозит</h3>

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
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : undefined)}
            className={INPUT}
          >
            <option value="">— изберете клиент —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.egn ? `(ЕГН ${c.egn})` : c.eik ? `(ЕИК ${c.eik})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Тип клиент</label>
            <select value={clientKind} onChange={(e) => setClientKind(e.target.value as ClientKind)} className={INPUT}>
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
            <div className="flex flex-col gap-1">
              <label className={LABEL}>ЕИК *</label>
              <input type="text" value={clientEik} onChange={(e) => setClientEik(e.target.value)} className={INPUT} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Адрес</label>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Дата (празно = днес)</label>
          <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Описание на МПС</label>
          <input
            type="text"
            value={vehicleDescription}
            onChange={(e) => setVehicleDescription(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Бюджет</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="напр. 8500"
              className={INPUT}
            />
            <select
              value={budgetCurrency}
              onChange={(e) => setBudgetCurrency(e.target.value as "EUR" | "USD")}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Сума на депозита * (мин. 500 евро по шаблон)</label>
          <input
            type="text"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {status.kind === "error" ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-semibold text-[#b3261e]">{status.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Запазване…" : "Създай депозит"}
      </button>
    </form>
  );
}
