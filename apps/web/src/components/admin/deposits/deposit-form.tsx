"use client";

import { ADMIN_INPUT, AdminBanner, adminChipClass } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { AlertIcon, ChevronDownIcon } from "@/components/icons";
import { CLIENT_KIND_META, type ClientKind } from "@/constants/contracts";
import { createDeposit } from "@/mutations/deposits";
import type { ClientRow } from "@/queries/clients";
import { createDepositSchema } from "@/schemas/deposit.schema";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Create form for a deposit contract (/admin/depoziti — spec §14; boards `ab-deposits-empty`, `-form`, `-states`).
 * Mirrors the contract wizard's client section (existing or new client); the amount floor from the template (500 EUR,
 * чл. 3) is a placeholder hint, not a hard rule. The server action mints the independent deposit number series.
 *
 * The form runs the server's own schema first and puts each message under its field (the kit's field error,
 * `noValidate`); the banner keeps the server's refusals and a lost connection. The server re-checks everything.
 */
type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "created"; number: string };

/** Which field a schema issue belongs to, by its path. */
type FieldKey = "client" | "name" | "egn" | "eik" | "address" | "phone" | "email" | "date" | "vehicle" | "budget" | "amount";
const FIELD_OF: Record<string, FieldKey> = {
  clientId: "client",
  "newClient.name": "name",
  "newClient.egn": "egn",
  "newClient.eik": "eik",
  "newClient.address": "address",
  "newClient.phone": "phone",
  "newClient.email": "email",
  depositDate: "date",
  vehicleDescription: "vehicle",
  budgetAmount: "budget",
  depositAmount: "amount",
};

/** A labelled control with its error under it. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
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
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);

  /** The props that tie a control to its error. */
  const errorProps = (key: FieldKey, id: string) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id}-err` } : {};
  const cls = (key: FieldKey) => (errors[key] ? `${ADMIN_INPUT} is-err` : ADMIN_INPUT);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
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
    };

    // The server's own schema, first: each message under its field.
    const parsed = createDepositSchema.safeParse(input);
    if (!parsed.success) {
      const next: Partial<Record<FieldKey, string>> = {};
      let unplaced: string | null = null;
      for (const issue of parsed.error.issues) {
        const key = FIELD_OF[issue.path.join(".")];
        if (key) next[key] ??= issue.message;
        else unplaced ??= issue.message;
      }
      setErrors(next);
      setStatus(unplaced ? { kind: "error", message: unplaced } : { kind: "idle" });
      return;
    }
    setErrors({});

    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await createDeposit(input);
      if (result.success) {
        // Start over and say what was made: the form used to stay filled in
        // with no word of success, inviting a second click — and a second
        // deposit (and, for a new client, a second client).
        setClientId(undefined);
        setClientName("");
        setClientEgn("");
        setClientEik("");
        setClientAddress("");
        setClientPhone("");
        setClientEmail("");
        setDepositDate("");
        setVehicleDescription("ЛЕК АВТОМОБИЛ");
        setBudgetAmount("");
        setBudgetCurrency("EUR");
        setDepositAmount("500");
        setStatus({ kind: "created", number: result.data.number });
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
    <form onSubmit={onSubmit} noValidate className="ab-depf">
      <fieldset className="ab-chiprow m-0 border-0 p-0">
        <legend className="sr-only">Клиент</legend>
        {/* A choice pill: a real radio, visually hidden (not display:none, so the
            keyboard and screen readers still reach it), with its label as the pill. */}
        <label className={adminChipClass(clientMode === "existing")}>
          <input
            type="radio"
            name="depositClientMode"
            checked={clientMode === "existing"}
            onChange={() => setClientMode("existing")}
            className="sr-only"
          />
          Съществуващ клиент
        </label>
        <label className={adminChipClass(clientMode === "new")}>
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
        <Field id={fid("client")} label="Клиент" error={errors.client}>
          <span className="sa-selw">
            <select
              id={fid("client")}
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : undefined)}
              className={cls("client")}
              {...errorProps("client", fid("client"))}
            >
              <option value="">— изберете клиент —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.egn ? `(ЕГН ${c.egn})` : c.eik ? `(ЕИК ${c.eik})` : ""}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </span>
        </Field>
      ) : (
        <div className="ab-g2">
          <Field id={fid("kind")} label="Тип клиент">
            <span className="sa-selw">
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
              </select>
              <ChevronDownIcon />
            </span>
          </Field>
          <Field
            id={fid("name")}
            label={clientKind === "individual" ? "Три имена *" : "Име на фирмата *"}
            error={errors.name}
          >
            <input
              id={fid("name")}
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={cls("name")}
              {...errorProps("name", fid("name"))}
            />
          </Field>
          {clientKind === "individual" ? (
            <Field id={fid("egn")} label="ЕГН *" error={errors.egn}>
              <input
                id={fid("egn")}
                type="text"
                inputMode="numeric"
                value={clientEgn}
                onChange={(e) => setClientEgn(e.target.value)}
                className={cls("egn")}
                {...errorProps("egn", fid("egn"))}
              />
            </Field>
          ) : (
            <Field id={fid("eik")} label="ЕИК *" error={errors.eik}>
              <input
                id={fid("eik")}
                type="text"
                inputMode="numeric"
                value={clientEik}
                onChange={(e) => setClientEik(e.target.value)}
                className={cls("eik")}
                {...errorProps("eik", fid("eik"))}
              />
            </Field>
          )}
          <Field id={fid("address")} label="Адрес" error={errors.address}>
            <input
              id={fid("address")}
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className={cls("address")}
              {...errorProps("address", fid("address"))}
            />
          </Field>
          <Field id={fid("phone")} label="Телефон" error={errors.phone}>
            <input
              id={fid("phone")}
              type="text"
              inputMode="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className={cls("phone")}
              {...errorProps("phone", fid("phone"))}
            />
          </Field>
          <Field id={fid("email")} label="Имейл" error={errors.email}>
            <input
              id={fid("email")}
              type="text"
              inputMode="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className={cls("email")}
              {...errorProps("email", fid("email"))}
            />
          </Field>
        </div>
      )}

      <div className="ab-g2">
        <Field id={fid("date")} label="Дата (празно = днес)" error={errors.date}>
          <input
            id={fid("date")}
            type="date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
            className={cls("date")}
            {...errorProps("date", fid("date"))}
          />
        </Field>
        <Field id={fid("vehicle")} label="Описание на МПС" error={errors.vehicle}>
          <input
            id={fid("vehicle")}
            type="text"
            value={vehicleDescription}
            onChange={(e) => setVehicleDescription(e.target.value)}
            className={cls("vehicle")}
            {...errorProps("vehicle", fid("vehicle"))}
          />
        </Field>
        <Field id={fid("budget")} label="Бюджет" error={errors.budget}>
          <div className="ab-cur">
            <input
              id={fid("budget")}
              type="text"
              inputMode="decimal"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="напр. 8500"
              className={cls("budget")}
              {...errorProps("budget", fid("budget"))}
            />
            <span className="sa-selw">
              <select
                aria-label="Валута на бюджета и депозита"
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value as "EUR" | "USD")}
                className={ADMIN_INPUT}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
              <ChevronDownIcon />
            </span>
          </div>
        </Field>
        <Field id={fid("amount")} label="Сума на депозита * (мин. 500 евро по шаблон)" error={errors.amount}>
          <input
            id={fid("amount")}
            type="text"
            inputMode="decimal"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className={cls("amount")}
            {...errorProps("amount", fid("amount"))}
          />
        </Field>
      </div>

      {status.kind === "error" ? (
        <AdminBanner tone="error" className="ab-al">
          {status.message}
        </AdminBanner>
      ) : null}
      {status.kind === "created" ? (
        <AdminBanner tone="success" className="ab-al">
          Договор за депозит № {status.number} е създаден — вижте го в списъка.
        </AdminBanner>
      ) : null}

      <div>
        <Button type="submit" variant="pri" size="md" className="ad-wph" disabled={busy} busy={busy}>
          {busy ? "Запазване…" : "Създайте депозит"}
        </Button>
      </div>
    </form>
  );
}
