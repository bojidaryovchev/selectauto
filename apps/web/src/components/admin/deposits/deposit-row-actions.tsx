"use client";

import { ADMIN_INPUT } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AlertIcon, ChevronDownIcon, Trash2Icon } from "@/components/icons";
import { DEPOSIT_STATUS_META, DEPOSIT_STATUSES, type DepositStatus } from "@/constants/contracts";
import { deleteDeposit, updateDepositStatus } from "@/mutations/deposits";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Status changer for one deposit row (spec §14; board `ab-deposits-states`). 'used' is missing from the options on
 * purpose — only contract creation sets it (automatic deduction); a used deposit has nothing to change, so nothing is
 * rendered for it. A cancelled deposit can be deleted, after a confirmation.
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
    } catch {
      // A request that never reached the server: it used to leave the dialog open without a word.
      setConfirmDelete(false);
      setError("Грешка при запис.");
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
    <>
      <label htmlFor={selectId} className="sr-only">
        Статус на депозит № {number}
      </label>
      <span className="sa-selw">
        <select
          id={selectId}
          value={status}
          disabled={busy}
          onChange={(e) => void onChange(e.target.value)}
          className={ADMIN_INPUT}
        >
          {DEPOSIT_STATUSES.filter((s) => s !== "used").map((s) => (
            <option key={s} value={s}>
              {DEPOSIT_STATUS_META[s as DepositStatus].label}
            </option>
          ))}
        </select>
        <ChevronDownIcon />
      </span>
      {/* An anulled deposit can be cleared out of the list entirely. */}
      {status === "cancelled" ? (
        <Button variant="neg" size="md" disabled={busy} onClick={() => setConfirmDelete(true)}>
          <Trash2Icon />
          Изтрийте
        </Button>
      ) : null}
      {error ? (
        <span role="alert" className="sa-err">
          <AlertIcon />
          {error}
        </span>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Изтриване на депозит № ${number}?`}
        message="Действието е необратимо — заедно с депозита се изтрива и генерираният договор."
        confirmLabel="Изтрийте"
        tone="danger"
        isPending={busy}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
