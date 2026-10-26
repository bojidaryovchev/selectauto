"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_CONTROL, ADMIN_HINT, ADMIN_LABEL, AdminBanner, AdminButton } from "@/components/admin/ui";
import { setNextNumber } from "@/mutations/contracts";
import type { NumberingRow } from "@/queries/contracts";

/**
 * Admin-only editor for where a document series continues from — e.g. after a
 * contract was issued on paper, or to align the system with the paper register.
 * Collapsed by default: it changes legal document identifiers, so it shouldn't
 * invite idle clicking. The server re-checks the role and refuses a number that
 * is already in use.
 */
export function NumberingSettings({ numbering }: { numbering: NumberingRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(numbering.nextNo));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const label = numbering.series === "contract" ? "договор" : "депозит";
  const preview = `${numbering.year}-${String(Math.max(1, Number(value) || 0)).padStart(3, "0")}`;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result = await setNextNumber({ series: numbering.series, nextNo: Number(value), year: numbering.year });
      if (result.success) {
        setStatus({ kind: "ok", message: `Следващият ${label} ще бъде № ${result.data.nextNumber}.` });
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      setStatus({ kind: "error", message: "Възникна грешка. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  const inputId = `next-number-${numbering.series}`;

  return (
    <div className="rounded-xl border border-line bg-white px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="py-1 text-muted">
          Следващ номер: <span className="font-bold text-ink">{numbering.nextNumber}</span>
          {numbering.highestUsed ? (
            <span className="ml-2 text-xs">(последен използван: {numbering.highestUsed})</span>
          ) : null}
        </p>
        <AdminButton variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="-mr-2">
          {open ? "Затвори" : "Промени номерацията"}
        </AdminButton>
      </div>

      {open ? (
        <form onSubmit={onSave} className="my-2 flex flex-col gap-2 border-t border-line pt-3">
          <label htmlFor={inputId} className={ADMIN_LABEL}>
            Номер на следващия {label} за {numbering.year} г.
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted">{numbering.year}-</span>
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              max={99999}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${ADMIN_CONTROL} w-28`}
            />
            <span className="text-sm text-muted">→ {preview}</span>
            <AdminButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Запазване…" : "Запази"}
            </AdminButton>
          </div>
          <p className={ADMIN_HINT}>
            Използва се, когато номерацията трябва да продължи от определено място — например след договор, издаден на
            хартия. Вече използван номер не се приема; заетите номера се прескачат автоматично при създаване.
          </p>
          {status ? <AdminBanner tone={status.kind === "ok" ? "success" : "error"}>{status.message}</AdminBanner> : null}
        </form>
      ) : null}
    </div>
  );
}
