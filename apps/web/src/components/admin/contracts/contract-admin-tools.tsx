"use client";

import { ADMIN_CONTROL, AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ChevronDownIcon, SettingsIcon, Trash2Icon } from "@/components/icons";
import { deleteContract, setContractNumber } from "@/mutations/contracts";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * Admin tools on the contract detail (`ab-tools`; boards `ab-contract-edit`, `-parts`, `-del-flow`): renumber, and
 * delete a CANCELLED contract. Both are destructive-ish and admin-only, so they sit in their own folding panel rather
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
    } catch {
      // A request that never reached the server: it used to leave the dialog open without a word.
      setConfirmDelete(false);
      setStatus({ kind: "error", message: "Възникна грешка. Моля опитайте отново." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="ab-disc">
      <summary>
        <span>
          <SettingsIcon />
          Административни действия
        </span>
        <ChevronDownIcon />
      </summary>
      <div className="ab-disc__b">
        <form onSubmit={onRename} noValidate className="ab-tools">
          <div className="ab-fld">
            <label htmlFor={numberId} className="sa-lbl">
              Номер на договора
            </label>
            <div className="ab-tools__row">
              <input
                id={numberId}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="2026-093"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`${ADMIN_CONTROL} ab-mono`}
              />
              <Button type="submit" variant="sec" size="md" disabled={busy || value.trim() === number} busy={busy}>
                Запазете номера
              </Button>
            </div>
            <p className="ab-hint">
              Използва се, за да се затвори празнина в номерацията.
              {documentCount > 0
                ? " Внимание: вече генерираните документи запазват стария номер — след промяната генерирайте нова версия."
                : ""}
            </p>
          </div>
        </form>

        <div className="ab-tools__del">
          <b>Изтриване на договора</b>
          <p className="ab-hint">
            {isCancelled
              ? "Договорът и всички свързани с него плащания, известия и файлове ще бъдат изтрити безвъзвратно."
              : "Само анулиран договор може да бъде изтрит. Първо променете статуса на „Анулиран“ от секцията за редакция."}
          </p>
          <Button variant="neg" size="md" disabled={busy || !isCancelled} onClick={() => setConfirmDelete(true)}>
            <Trash2Icon />
            Изтрийте договора
          </Button>
        </div>

        {status_ ? (
          <AdminBanner tone={status_.kind === "ok" ? "success" : "error"} className="ab-al">
            {status_.message}
          </AdminBanner>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Изтриване на договор № ${number}?`}
        message="Действието е необратимо — заедно с договора се изтриват плащанията, генерираните известия и прикачените файлове."
        confirmLabel="Изтрийте"
        tone="danger"
        isPending={busy}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </details>
  );
}
