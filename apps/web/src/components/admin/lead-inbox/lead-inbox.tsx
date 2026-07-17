"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { AdminLeadView } from "@/types/admin.type";
import { LeadFilters } from "@/components/admin/lead-filters";
import { LeadStatusBadge } from "@/components/admin/lead-status-badge";
import { LeadDetailDrawer } from "./lead-detail-drawer";

/**
 * The generic lead inbox: filter bar + a table of leads + a detail drawer, plus
 * pagination. Type-agnostic — the server maps each lead type's rows to the
 * shared `AdminLeadView` (compact `cells` aligned to `columns`, full `details`
 * for the drawer). Clicking a row opens the drawer where status/notes are edited.
 */
export function LeadInbox({
  basePath,
  columns,
  leads,
  page,
  pageCount,
  total,
}: {
  basePath: string;
  columns: string[];
  leads: AdminLeadView[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<AdminLeadView | null>(null);

  function goToPage(next: number) {
    const sp = new URLSearchParams(params.toString());
    if (next <= 1) sp.delete("page");
    else sp.set("page", String(next));
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div>
      <LeadFilters basePath={basePath} />

      <p className="mb-2 text-sm text-muted">
        Намерени: <span className="font-bold text-ink">{total}</span>
      </p>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center text-muted">
          Няма заявки за този филтър.
        </div>
      ) : (
        <>
          {/* Mobile: tappable cards (a table would need to scroll horizontally). */}
          <ul className="space-y-3 md:hidden">
            {leads.map((lead) => (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => setSelected(lead)}
                  className="flex w-full flex-col gap-2 rounded-2xl border border-line bg-white p-4 text-left transition-colors active:bg-[#fafafa]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-ink">{lead.cells[0]}</span>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <dl className="space-y-1 text-sm">
                    {columns.slice(1).map((col, i) => (
                      <div key={col} className="flex justify-between gap-3">
                        <dt className="shrink-0 text-muted">{col}</dt>
                        <dd className="wrap-break-word text-right text-ink">{lead.cells[i + 1]}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted">Получено</dt>
                      <dd className="text-right text-muted">{lead.createdAt}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop: full table. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
            <table className="w-full min-w-184 text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-3 font-bold">
                      {c}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-bold">Получено</th>
                  <th className="px-4 py-3 font-bold">Статус</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-[#fafafa]"
                  >
                    {lead.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 ${i === 0 ? "font-semibold text-ink" : "text-muted"}`}
                      >
                        {cell}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{lead.createdAt}</td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-sm text-muted">
            Страница {page} от {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Напред
          </button>
        </div>
      )}

      {selected && <LeadDetailDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
