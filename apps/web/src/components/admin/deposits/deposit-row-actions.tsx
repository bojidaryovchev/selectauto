"use client";

import { ADMIN_CONTROL, AdminButton } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DEPOSIT_STATUS_META, DEPOSIT_STATUSES, type DepositStatus } from "@/constants/contracts";
import { deleteDeposit, updateDepositStatus } from "@/mutations/deposits";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Status changer for one deposit row (spec §14). 'used' is missing from the
 * options on purpose — only contract creation sets it (automatic deduction);
 * a used deposit has nothing to change, so nothing is rendered for it.
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
  const selectId = useId();
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

  if (status === "used") return null;

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
    <div className="flex flex-col items-start gap-2">
      <label htmlFor={selectId} className="sr-only">
        Статус на депозит № {number}
      </label>
      <select
        id={selectId}
        value={status}
        disabled={busy}
        onChange={(e) => void onChange(e.target.value)}
        className={`${ADMIN_CONTROL} w-52 max-w-full pr-8 font-semibold`}
      >
        {DEPOSIT_STATUSES.filter((s) => s !== "used").map((s) => (
          <option key={s} value={s}>
            {DEPOSIT_STATUS_META[s as DepositStatus].label}
          </option>
        ))}
      </select>
      {/* An anulled deposit can be cleared out of the list entirely. */}
      {status === "cancelled" ? (
        <AdminButton variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
          Изтрий
        </AdminButton>
      ) : null}
      {error ? (
        <span role="alert" className="text-xs font-semibold text-[#b3261e]">
          {error}
        </span>
      ) : null}

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
