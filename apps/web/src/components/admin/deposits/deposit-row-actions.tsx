"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DEPOSIT_STATUS_META, DEPOSIT_STATUSES, type DepositStatus } from "@/constants/contracts";
import { deleteDeposit, updateDepositStatus } from "@/mutations/deposits";

/**
 * Status changer for one deposit row (spec §14). 'used' is missing from the
 * options on purpose — only contract creation sets it (automatic deduction);
 * a used deposit shows read-only.
 */
export function DepositRowActions({
  depositId,
  number,
  status,
}: {
  depositId: number;
  number: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onDelete() {
    setBusy(true);
    try {
      const result = await deleteDeposit(depositId);
      setConfirmDelete(false);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (status === "used") {
    return <span className="text-xs text-muted">—</span>;
  }

  async function onChange(next: string) {
    if (next === status) return;
    setBusy(true);
    setError(null);
    try {
      const result = await updateDepositStatus(depositId, next);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Грешка при запис.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        disabled={busy}
        onChange={(e) => void onChange(e.target.value)}
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none focus:border-brand disabled:opacity-60"
      >
        {DEPOSIT_STATUSES.filter((s) => s !== "used").map((s) => (
          <option key={s} value={s}>
            {DEPOSIT_STATUS_META[s as DepositStatus].label}
          </option>
        ))}
      </select>
      {/* An anulled deposit can be cleared out of the list entirely. */}
      {status === "cancelled" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          className="self-start text-xs font-bold text-[#c0392b] hover:underline disabled:opacity-50"
        >
          Изтрий
        </button>
      ) : null}
      {error ? <span className="text-xs font-semibold text-[#b3261e]">{error}</span> : null}

      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Изтриване на депозит № ${number}?`}
        message="Действието е необратимо — заедно с депозита се изтрива и генерираният договор."
        confirmLabel="Изтрий"
        tone="danger"
        isPending={busy}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
