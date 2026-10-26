"use client";

import { AdminButton } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatSofiaDate } from "@/lib/sofia-time";
import { generateDepositDocument } from "@/mutations/deposits";
import type { DepositDocumentRow } from "@/queries/deposits";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * „Разпечатай договор" for one deposit row (spec §14). Generating appends a new
 * version and keeps the old ones, exactly like the other documents; existing
 * versions list next to the button for download. A further version is confirmed
 * first, as on the contract (§10 „нова версия след потвърждение").
 */
export function DepositDocumentButton({
  depositId,
  documents,
}: {
  depositId: number;
  documents: DepositDocumentRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const result = await generateDepositDocument(depositId);
      setConfirmOpen(false);
      if (result.success) {
        router.refresh();
        window.open(`/api/payment-document/${result.data.documentId}`, "_blank");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Грешка при генериране.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <AdminButton
        variant="primary"
        disabled={busy}
        onClick={() => (documents.length > 0 ? setConfirmOpen(true) : void run())}
        className="whitespace-nowrap"
      >
        {busy ? "Генериране…" : documents.length > 0 ? "Нова версия" : "Договор (PDF)"}
      </AdminButton>
      {documents.map((d) => (
        <a
          key={d.id}
          href={`/api/payment-document/${d.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center text-sm font-semibold whitespace-nowrap text-brand hover:underline"
        >
          в.{d.version} ({formatSofiaDate(d.createdAt)}) ⬇
        </a>
      ))}
      {error ? (
        <span role="alert" className="text-xs font-semibold text-[#b3261e]">
          {error}
        </span>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Нова версия на договора за депозит?"
        message={`Вече има ${documents.length} генерирана(и) версия(и). Старите се запазват и остават достъпни за изтегляне.`}
        confirmLabel="Генерирай нова версия"
        isPending={busy}
        onConfirm={() => void run()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
