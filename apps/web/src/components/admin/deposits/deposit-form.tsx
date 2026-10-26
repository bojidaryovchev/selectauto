"use client";

import { ADMIN_CONTROL, ADMIN_INPUT, ADMIN_LABEL, ADMIN_SELECT, AdminBanner, AdminButton } from "@/components/admin/ui";
import { CLIENT_KIND_META, type ClientKind } from "@/constants/contracts";
import { createDeposit } from "@/mutations/deposits";
import type { ClientRow } from "@/queries/clients";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Create form for a deposit contract (/admin/depoziti — spec §14). Mirrors the
 * contract wizard's client section (existing or new client); the amount floor
 * from the template (500 EUR, чл. 3) is a placeholder hint, not a hard rule.
 * The server action mints the independent deposit number series.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string };

/** A labelled control. */
function Field({ id, label, children }: { id: string; label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function DepositForm({ clients, onDone }: { clients: ClientRow[]; onDone?: () => void }) {
  const router = useRouter();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
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

  // A choice pill: a real radio, visually hidden (not display:none, so the
  // keyboard and screen readers still reach it), with its label as the pill.
  const choiceClass = (active: boolean) =>
    `flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
      active ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:border-brand/50"
    }`;

  return (
    <form onSubmit={onSubmit} className="@container flex flex-col gap-4">
      <fieldset className="flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">Клиент</legend>
        <label className={choiceClass(clientMode === "existing")}>
          <input
            type="radio"
            name="depositClientMode"
            checked={clientMode === "existing"}
            onChange={() => setClientMode("existing")}
            className="sr-only"
          />
          Съществуващ клиент
        </label>
        <label className={choiceClass(clientMode === "new")}>
          <input
            type="radio"
            name="depositClientMode"
            checked={clientMode === "new"}
            onChange={() => setClientMode("new")}
            className="sr-only"
          />
          Нов клиент
        </label>
      </fieldset>

      {clientMode === "existing" ? (
        <Field id={fid("client")} label="Клиент">
          <select
            id={fid("client")}
            value={clientId ?? ""}
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : undefined)}
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
          )}
          <Field id={fid("address")} label="Адрес">
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

      <div className="grid gap-4 @lg:grid-cols-2">
        <Field id={fid("date")} label="Дата (празно = днес)">
          <input
            id={fid("date")}
            type="date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
            className={ADMIN_INPUT}
          />
        </Field>
        <Field id={fid("vehicle")} label="Описание на МПС">
          <input
            id={fid("vehicle")}
            type="text"
            value={vehicleDescription}
            onChange={(e) => setVehicleDescription(e.target.value)}
            className={ADMIN_INPUT}
          />
        </Field>
        <Field id={fid("budget")} label="Бюджет">
          <div className="flex gap-2">
            <input
              id={fid("budget")}
              type="text"
              inputMode="decimal"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="напр. 8500"
              className={ADMIN_INPUT}
            />
            <select
              aria-label="Валута на бюджета и депозита"
              value={budgetCurrency}
              onChange={(e) => setBudgetCurrency(e.target.value as "EUR" | "USD")}
              className={`${ADMIN_CONTROL} w-24 shrink-0 pr-8`}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </Field>
        <Field id={fid("amount")} label="Сума на депозита * (мин. 500 евро по шаблон)">
          <input
            id={fid("amount")}
            type="text"
            inputMode="decimal"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className={ADMIN_INPUT}
          />
        </Field>
      </div>

      {status.kind === "error" ? <AdminBanner tone="error">{status.message}</AdminBanner> : null}

      <AdminButton type="submit" variant="primary" size="lg" disabled={busy} className="self-start">
        {busy ? "Запазване…" : "Създай депозит"}
      </AdminButton>
    </form>
  );
}
