"use client";

import { Button } from "@/components/common";
import { buttonClasses } from "@/components/common/button-variants";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AlertIcon, DownloadIcon, FilePlusIcon } from "@/components/icons";
import { formatSofiaDate } from "@/lib/sofia-time";
import { generateDepositDocument } from "@/mutations/deposits";
import type { DepositDocumentRow } from "@/queries/deposits";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * „Договор (PDF)" for one deposit row (spec §14; board `ab-deposits`, its states and `ab-dialogs`). Generating appends
 * a new version and keeps the old ones, exactly like the other documents; existing versions list next to the button
 * for download. A further version is confirmed first, as on the contract (§10 „нова версия след потвърждение").
 * Secondary: the page's one primary is the form's (notes ab §4).
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
      // A request that never reached the server: the dialog used to stay open over the error.
      setConfirmOpen(false);
      setError("Грешка при генериране.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="ab-dep-doc">
        <Button
          variant="sec"
          size="md"
          disabled={busy}
          busy={busy}
          onClick={() => (documents.length > 0 ? setConfirmOpen(true) : void run())}
        >
          {busy ? null : <FilePlusIcon />}
          {busy ? "Генериране…" : documents.length > 0 ? "Нова версия" : "Договор (PDF)"}
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
            в.{d.version} ({formatSofiaDate(d.createdAt)})
          </a>
        ))}
      </div>
      {error ? (
        <span role="alert" className="sa-err">
          <AlertIcon />
          {error}
        </span>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Нова версия на договора за депозит?"
        message={`Вече има ${documents.length} генерирана(и) версия(и). Старите се запазват и остават достъпни за изтегляне.`}
        confirmLabel="Генерирайте нова версия"
        isPending={busy}
        onConfirm={() => void run()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
