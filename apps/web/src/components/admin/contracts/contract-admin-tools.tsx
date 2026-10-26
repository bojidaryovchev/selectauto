"use client";

import { ADMIN_CONTROL, ADMIN_HINT, ADMIN_LABEL, AdminBanner, AdminButton } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ChevronDownIcon } from "@/components/icons";
import { deleteContract, setContractNumber } from "@/mutations/contracts";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

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
  const numberId = useId();
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
    <details className="group rounded-xl border border-line bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-lg font-black text-ink select-none sm:px-5 [&::-webkit-details-marker]:hidden">
        Административни действия
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4 sm:p-5">
        <form onSubmit={onRename} className="flex flex-col gap-2">
          <label htmlFor={numberId} className={ADMIN_LABEL}>
            Номер на договора
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={numberId}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="2026-093"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`${ADMIN_CONTROL} w-40`}
            />
            <AdminButton type="submit" variant="primary" disabled={busy || value.trim() === number}>
              Запази номера
            </AdminButton>
          </div>
          <p className={ADMIN_HINT}>
            Използва се, за да се затвори празнина в номерацията.
            {documentCount > 0
              ? " Внимание: вече генерираните документи запазват стария номер — след промяната генерирайте нова версия."
              : ""}
          </p>
        </form>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">Изтриване на договора</p>
          <p className={ADMIN_HINT}>
            {isCancelled
              ? "Договорът и всички свързани с него плащания, известия и файлове ще бъдат изтрити безвъзвратно."
              : "Само анулиран договор може да бъде изтрит. Първо променете статуса на „Анулиран“ от секцията за редакция."}
          </p>
          <AdminButton
            variant="danger"
            disabled={busy || !isCancelled}
            onClick={() => setConfirmDelete(true)}
            className="self-start"
          >
            Изтрий договора
          </AdminButton>
        </div>

        {status_ ? (
          <AdminBanner tone={status_.kind === "ok" ? "success" : "error"}>{status_.message}</AdminBanner>
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
