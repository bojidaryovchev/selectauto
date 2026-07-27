"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          Следващ номер: <span className="font-bold text-ink">{numbering.nextNumber}</span>
          {numbering.highestUsed ? (
            <span className="ml-2 text-xs">(последен използван: {numbering.highestUsed})</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full px-3 py-1 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
        >
          {open ? "Затвори" : "Промени номерацията"}
        </button>
      </div>

      {open ? (
        <form onSubmit={onSave} className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <label className="text-xs font-semibold text-ink">
            Номер на следващия {label} за {numbering.year} г.
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted">{numbering.year}-</span>
            <input
              type="number"
              min={1}
              max={99999}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <span className="text-sm text-muted">→ {preview}</span>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Запазване…" : "Запази"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Използва се, когато номерацията трябва да продължи от определено място — например след договор, издаден на
            хартия. Вече използван номер не се приема; заетите номера се прескачат автоматично при създаване.
          </p>
          {status ? (
            <p
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                status.kind === "ok" ? "bg-[#e8f5ec] text-[#1d6b35]" : "bg-[#fdecea] text-[#b3261e]"
              }`}
            >
              {status.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
