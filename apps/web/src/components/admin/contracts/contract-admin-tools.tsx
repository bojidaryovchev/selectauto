"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { deleteContract, setContractNumber } from "@/mutations/contracts";

/**
 * Admin tools on the contract detail: renumber, and delete a CANCELLED contract.
 * Both are destructive-ish and admin-only, so they sit in their own panel rather
 * than next to the everyday actions.
 */
export function ContractAdminTools({
  contractId,
  number,
  status,
  documentCount,
}: {
  contractId: number;
  number: string;
  status: string;
  /** Generated documents — a renumber leaves their frozen number behind. */
  documentCount: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(number);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status_, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const isCancelled = status === "cancelled";

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result = await setContractNumber(contractId, value.trim());
      if (result.success) {
        setStatus({ kind: "ok", message: `Договорът вече е № ${result.data.number}.` });
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

  async function onDelete() {
    setBusy(true);
    try {
      const result = await deleteContract(contractId);
      setConfirmDelete(false);
      if (result.success) {
        router.push("/admin/dogovori");
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border border-line bg-white">
      <summary className="cursor-pointer select-none px-5 py-4 text-lg font-black text-ink">
        Административни действия
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-5">
        <form onSubmit={onRename} className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-ink">Номер на договора</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="2026-093"
              className="w-40 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy || value.trim() === number}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Запази номера
            </button>
          </div>
          <p className="text-xs text-muted">
            Използва се, за да се затвори празнина в номерацията.
            {documentCount > 0
              ? " Внимание: вече генерираните документи запазват стария номер — след промяната генерирайте нова версия."
              : ""}
          </p>
        </form>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">Изтриване на договора</p>
          <p className="text-xs text-muted">
            {isCancelled
              ? "Договорът и всички свързани с него плащания, известия и файлове ще бъдат изтрити безвъзвратно."
              : "Само анулиран договор може да бъде изтрит. Първо променете статуса на „Анулиран“ от секцията за редакция."}
          </p>
          <button
            type="button"
            disabled={busy || !isCancelled}
            onClick={() => setConfirmDelete(true)}
            className="self-start rounded-full border border-[#c0392b] px-4 py-1.5 text-sm font-bold text-[#c0392b] transition-colors hover:bg-[#fdecea] disabled:opacity-40"
          >
            Изтрий договора
          </button>
        </div>

        {status_ ? (
          <p
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              status_.kind === "ok" ? "bg-[#e8f5ec] text-[#1d6b35]" : "bg-[#fdecea] text-[#b3261e]"
            }`}
          >
            {status_.message}
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Изтриване на договор № ${number}?`}
        message="Действието е необратимо — заедно с договора се изтриват плащанията, генерираните известия и прикачените файлове."
        confirmLabel="Изтрий"
        tone="danger"
        isPending={busy}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </details>
  );
}
