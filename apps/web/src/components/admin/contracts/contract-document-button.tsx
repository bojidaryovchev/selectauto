"use client";

import { AdminBanner, AdminButton, adminButtonClass } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatSofiaDate } from "@/lib/sofia-time";
import { generateContractDocument } from "@/mutations/contracts";
import type { GeneratedDocumentRow } from "@/queries/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * „Генерирай договор" on the contract detail — renders the contract document
 * itself (посредничество or доставка, by market). Regeneration is confirmed
 * first, because it appends a new version rather than replacing the old one
 * (§10 „Вече генериран документ — разрешава се нова версия след потвърждение").
 */
export function ContractDocumentButton({
  contractId,
  documents,
}: {
  contractId: number;
  /** Existing `contract`-kind versions, newest first. */
  documents: GeneratedDocumentRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const result = await generateContractDocument(contractId);
      setConfirmOpen(false);
      if (result.success) {
        router.refresh();
        window.open(`/api/payment-document/${result.data.documentId}`, "_blank");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Възникна грешка при генерирането.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton
          variant="primary"
          disabled={busy}
          onClick={() => (documents.length > 0 ? setConfirmOpen(true) : void run())}
        >
          {busy ? "Генериране…" : documents.length > 0 ? "Генерирай нова версия" : "Генерирай договор (PDF)"}
        </AdminButton>
        {documents.map((d) => (
          <a
            key={d.id}
            href={`/api/payment-document/${d.id}`}
            target="_blank"
            rel="noreferrer"
            className={adminButtonClass("ghost")}
          >
            Версия {d.version} ({formatSofiaDate(d.createdAt)}) ⬇
          </a>
        ))}
      </div>
      {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Нова версия на договора?"
        message={`Вече има ${documents.length} генерирана(и) версия(и). Старите се запазват и остават достъпни за изтегляне.`}
        confirmLabel="Генерирай нова версия"
        isPending={busy}
        onConfirm={() => void run()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
