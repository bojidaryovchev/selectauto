"use client";

import { AdminBanner, AdminButton, AdminEmptyState } from "@/components/admin/ui";
import { RECIPIENT_KIND_META, type RecipientKind } from "@/constants/contracts";
import { missingBankFields } from "@/lib/recipient-bank";
import type { RecipientRow } from "@/queries/recipients";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RecipientForm } from "./recipient-form";

/**
 * The /admin/poluchateli manager: one card per recipient; „Редактирай" turns
 * that card into its form (it used to open below the whole table — off screen
 * on a phone, so the button seemed to do nothing), and a new recipient's form
 * opens at the top. Recipients are never deleted — documents reference them — a
 * retired partner is just deactivated. Server data comes from the page; after a
 * save the router refreshes so the list reflects the change.
 */
export function RecipientsManager({ recipients }: { recipients: RecipientRow[] }) {
  const router = useRouter();
  /** null = closed; "new" = creating; otherwise the id being edited. */
  const [editing, setEditing] = useState<number | "new" | null>(null);

  function onDone() {
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {editing === "new" ? (
        <RecipientForm key="new" recipient={null} onDone={onDone} onCancel={() => setEditing(null)} />
      ) : (
        <AdminButton variant="primary" size="lg" className="self-start" onClick={() => setEditing("new")}>
          + Добави получател
        </AdminButton>
      )}

      {recipients.length === 0 ? (
        <AdminEmptyState title="Още няма получатели." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {recipients.map((r) => (
            <li key={r.id}>
              {editing === r.id ? (
                <RecipientForm recipient={r} onDone={onDone} onCancel={() => setEditing(null)} />
              ) : (
                <RecipientCard recipient={r} onEdit={() => setEditing(r.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipientCard({ recipient: r, onEdit }: { recipient: RecipientRow; onEdit: () => void }) {
  const missing = missingBankFields(r);
  return (
    <article className="@container flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-base font-black wrap-anywhere text-ink">{r.name}</h2>
          <p className="text-sm text-muted">
            {RECIPIENT_KIND_META[r.kind as RecipientKind]?.label ?? r.kind}
            {r.country ? ` · ${r.country}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {r.active ? (
            <span className="rounded-full bg-[#e8f5ec] px-2.5 py-1 text-xs font-bold text-[#1d6b35]">Активен</span>
          ) : (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted">Неактивен</span>
          )}
          <AdminButton variant="secondary" onClick={onEdit}>
            Редактирай
          </AdminButton>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm @xl:grid-cols-2 @4xl:grid-cols-4">
        <Detail label="Банка" value={r.bankName} />
        <Detail label="IBAN / Сметка" value={r.iban} mono />
        <Detail label="SWIFT / BIC" value={r.swiftBic} mono />
        <Detail label="Валута" value={r.currency} />
      </dl>

      {missing.length > 0 ? (
        <AdminBanner tone="warning">
          Липсва: {missing.join(", ")} — известия за плащане към този получател няма да се генерират, докато не се
          попълни.
        </AdminBanner>
      ) : null}
    </article>
  );
}

function Detail({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`wrap-anywhere text-ink ${mono ? "font-mono text-[13px]" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
