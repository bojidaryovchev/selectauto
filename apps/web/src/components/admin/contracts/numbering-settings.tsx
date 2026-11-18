"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_CONTROL, AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { AlertIcon } from "@/components/icons";
import { setNextNumber } from "@/mutations/contracts";
import type { NumberingRow } from "@/queries/contracts";

/** The server's own rule and message (set-next-number.mutation.ts), checked here first so the field can show it. */
const NUMBER_RULE = "Номерът трябва да е цяло число между 1 и 99999.";

/**
 * Admin-only editor for where a document series continues from — e.g. after a contract was issued on paper, or to
 * align the system with the paper register (`ab-numb`; boards `ab-contracts`, `ab-contracts-filter`,
 * `ab-contracts-states`, `ab-deposits-form`). Collapsed by default: it changes legal document identifiers, so it
 * shouldn't invite idle clicking. The number is checked in the form against the server's own rule, its message under
 * the field; the server re-checks the role and refuses a number that is already in use.
 */
export function NumberingSettings({ numbering }: { numbering: NumberingRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(numbering.nextNo));
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const label = numbering.series === "contract" ? "договор" : "депозит";
  const preview = `${numbering.year}-${String(Math.max(1, Number(value) || 0)).padStart(3, "0")}`;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value.trim());
    if (!value.trim() || !Number.isInteger(n) || n < 1 || n > 99999) {
      setFieldError(NUMBER_RULE);
      return;
    }
    setFieldError(null);
    setBusy(true);
    setStatus(null);
    try {
      const result = await setNextNumber({ series: numbering.series, nextNo: n, year: numbering.year });
      if (result.success) {
        setStatus({ kind: "ok", message: `Следващият ${label} ще бъде № ${result.data.nextNumber}.` });
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Възникна грешка. Моля, опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  const inputId = `next-number-${numbering.series}`;
  const summary = (
    <p className="ab-numb__l">
      Следващ номер: <b>{numbering.nextNumber}</b>
      {numbering.highestUsed ? <small>(последен използван: {numbering.highestUsed})</small> : null}
    </p>
  );
  const toggle = (
    <Button variant="txt" size="md" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      {open ? "Затворете" : "Променете номерацията"}
    </Button>
  );

  if (!open) {
    return (
      <div className="ab-numb">
        {summary}
        {toggle}
      </div>
    );
  }

  return (
    <div className="ab-numb ab-numb--open">
      <div className="ab-numb__top">
        {summary}
        {toggle}
      </div>
      <form onSubmit={onSave} noValidate className="ab-numb__f">
        <label htmlFor={inputId} className="sa-lbl">
          Номер на следващия {label} за {numbering.year} г.
        </label>
        <div className="ab-numb__in">
          <span className="ab-pre">{numbering.year}-</span>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setFieldError(null);
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${inputId}-err` : undefined}
            className={fieldError ? `${ADMIN_CONTROL} is-err` : ADMIN_CONTROL}
          />
          <span className="ab-arrow">→ {preview}</span>
          <Button type="submit" variant="sec" size="md" disabled={busy} busy={busy}>
            {busy ? "Запазване…" : "Запазете"}
          </Button>
        </div>
        {fieldError ? (
          <span id={`${inputId}-err`} className="sa-err">
            <AlertIcon />
            {fieldError}
          </span>
        ) : null}
        <p className="ab-hint">
          Използва се, когато номерацията трябва да продължи от определено място — например след договор, издаден на
          хартия. Вече използван номер не се приема; заетите номера се прескачат автоматично при създаване.
        </p>
        {status ? (
          <AdminBanner tone={status.kind === "ok" ? "success" : "error"} className="ab-al">
            {status.message}
          </AdminBanner>
        ) : null}
      </form>
    </div>
  );
}
