"use client";

import { AdminBanner, AdminEmptyState, AdminStatusTag } from "@/components/admin/ui";
import { Button } from "@/components/common";
import { LandmarkIcon, PlusIcon } from "@/components/icons";
import { RECIPIENT_KIND_META, type RecipientKind } from "@/constants/contracts";
import { missingBankFields } from "@/lib/recipient-bank";
import type { RecipientRow } from "@/queries/recipients";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RecipientForm } from "./recipient-form";

/**
 * The /admin/poluchateli manager (boards `ad-recipients`, `-edit`, `-states`; parity check
 * docs/design/parity/admin-recipients.md): one card per recipient; „Редактирайте" turns that card into its form (it
 * used to open below the whole table — off screen on a phone, so the button seemed to do nothing), and a new
 * recipient's form opens at the top. Recipients are never deleted — documents reference them — a retired partner is
 * just deactivated. Server data comes from the page; after a save the router refreshes so the list reflects the change.
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
    <>
      {editing === "new" ? (
        <div className="ad-rlist">
          <div className="is-wide">
            <RecipientForm key="new" recipient={null} onDone={onDone} onCancel={() => setEditing(null)} />
          </div>
        </div>
      ) : (
        <div>
          <Button variant="pri" size="md" className="ad-wph" onClick={() => setEditing("new")}>
            <PlusIcon />
            Добавете получател
          </Button>
        </div>
      )}

      {recipients.length === 0 ? (
        <AdminEmptyState icon={<LandmarkIcon />} title="Още няма получатели." />
      ) : (
        <ul className="ad-rlist">
          {recipients.map((r) => (
            <li key={r.id} className={editing === r.id ? "is-wide" : undefined}>
              {editing === r.id ? (
                <RecipientForm recipient={r} onDone={onDone} onCancel={() => setEditing(null)} />
              ) : (
                <RecipientCard recipient={r} onEdit={() => setEditing(r.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RecipientCard({ recipient: r, onEdit }: { recipient: RecipientRow; onEdit: () => void }) {
  const missing = missingBankFields(r);
  return (
    <article className="sa-pnl ad-rc">
      <div className="ad-rc__h">
        <div>
          <h2>{r.name}</h2>
          <p>
            {RECIPIENT_KIND_META[r.kind as RecipientKind]?.label ?? r.kind}
            {r.country ? ` · ${r.country}` : ""}
          </p>
        </div>
        <div className="ad-rc__a">
          {r.active ? <AdminStatusTag tone="pos">Активен</AdminStatusTag> : <AdminStatusTag tone={null}>Неактивен</AdminStatusTag>}
          <Button variant="sec" size="md" onClick={onEdit}>
            Редактирайте
          </Button>
        </div>
      </div>

      <dl>
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
    <div>
      <dt>{label}</dt>
      <dd className={!value ? "is-none" : mono ? "sa-mono is-mono" : undefined}>{value || "—"}</dd>
    </div>
  );
}
