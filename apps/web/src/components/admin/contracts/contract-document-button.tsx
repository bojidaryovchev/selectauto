"use client";

import { AdminBanner } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { buttonClasses } from "@/components/common/button-variants";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DownloadIcon, FilePlusIcon } from "@/components/icons";
import { formatSofiaDate } from "@/lib/sofia-time";
import { generateContractDocument } from "@/mutations/contracts";
import type { GeneratedDocumentRow } from "@/queries/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * „Генерирайте договор" on the contract detail (`ab-docs`; boards `ab-contract`, `-obs`, `-panels2`) — renders the
 * contract document itself (посредничество or доставка, by market). Regeneration is confirmed first, because it
 * appends a new version rather than replacing the old one (§10 „Вече генериран документ — разрешава се нова версия
 * след потвърждение"). Secondary beside the stage actions; `primary` when it is the viewer's only action (an observer).
 */
export function ContractDocumentButton({
  contractId,
  documents,
  primary = false,
}: {
  contractId: number;
  /** Existing `contract`-kind versions, newest first. */
  documents: GeneratedDocumentRow[];
  primary?: boolean;
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
      // A request that never reached the server: the dialog used to stay open over the error.
      setConfirmOpen(false);
      setError("Възникна грешка при генерирането.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ab-docs">
      <div className="ab-docs__r">
        <Button
          variant={primary ? "pri" : "sec"}
          size="md"
          disabled={busy}
          busy={busy}
          onClick={() => (documents.length > 0 ? setConfirmOpen(true) : void run())}
        >
          {busy ? null : <FilePlusIcon />}
          {busy ? "Генериране…" : documents.length > 0 ? "Генерирайте нова версия" : "Генерирайте договор (PDF)"}
        </Button>
        {documents.map((d) => (
          <a
            key={d.id}
            href={`/api/payment-document/${d.id}`}
            target="_blank"
            rel="noreferrer"
            className={`${buttonClasses({ variant: "txt", size: "md" })} ab-dlk`}
          >
            <DownloadIcon />
            Версия {d.version} ({formatSofiaDate(d.createdAt)})
          </a>
        ))}
      </div>
      {error ? (
        <AdminBanner tone="error" className="ab-al">
          {error}
        </AdminBanner>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Нова версия на договора?"
        message={`Вече има ${documents.length} генерирана(и) версия(и). Старите се запазват и остават достъпни за изтегляне.`}
        confirmLabel="Генерирайте нова версия"
        isPending={busy}
        onConfirm={() => void run()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
