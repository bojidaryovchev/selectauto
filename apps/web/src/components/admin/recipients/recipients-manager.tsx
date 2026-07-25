"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RECIPIENT_KIND_META, type RecipientKind } from "@/constants/contracts";
import type { RecipientRow } from "@/queries/recipients";
import { RecipientForm } from "./recipient-form";

/**
 * The /admin/poluchateli manager: the recipients table + one create/edit form
 * below it (spec §8). Recipients are never deleted — documents reference them —
 * a retired partner is just deactivated. Server data comes from the page; after
 * a save the router refreshes so the RSC list reflects the change.
 */
export function RecipientsManager({ recipients }: { recipients: RecipientRow[] }) {
  const router = useRouter();
  /** null = closed; "new" = creating; otherwise the row being edited. */
  const [editing, setEditing] = useState<RecipientRow | "new" | null>(null);

  function onDone() {
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Наименование</th>
              <th className="px-4 py-3 font-semibold">Тип</th>
              <th className="px-4 py-3 font-semibold">Банка</th>
              <th className="px-4 py-3 font-semibold">IBAN / Сметка</th>
              <th className="px-4 py-3 font-semibold">Валута</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {RECIPIENT_KIND_META[r.kind as RecipientKind]?.label ?? r.kind}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{r.bankName ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{r.iban ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{r.currency ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.active ? (
                    <span className="rounded-full bg-[#e8f5ec] px-2.5 py-1 text-xs font-bold text-[#1d6b35]">
                      Активен
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted">
                      Неактивен
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
                  >
                    Редактирай
                  </button>
                </td>
              </tr>
            ))}
            {recipients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  Няма получатели — приложете миграция 0038 (seed данните създават SelectAuto, Auto America и Lean
                  Customs).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing === null ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        >
          + Добави получател
        </button>
      ) : (
        <RecipientForm
          key={editing === "new" ? "new" : editing.id}
          recipient={editing === "new" ? null : editing}
          onDone={onDone}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
