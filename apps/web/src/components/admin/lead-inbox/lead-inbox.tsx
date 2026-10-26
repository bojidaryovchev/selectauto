"use client";

import { LeadFilters } from "@/components/admin/lead-filters";
import { LeadStatusBadge } from "@/components/admin/lead-status-badge";
import { AdminEmptyState, AdminPagination } from "@/components/admin/ui";
import type { AdminLeadView } from "@/types/admin.type";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LeadDetailDrawer } from "./lead-detail-drawer";

/**
 * The generic lead inbox: filter bar + a list of leads + a detail drawer, plus
 * pagination. Type-agnostic — the server maps each lead type's rows to the
 * shared `AdminLeadView` (compact `cells` aligned to `columns`, full `details`
 * for the drawer). Opening a lead shows the drawer where status/notes are edited.
 *
 * Cards while the list is narrower than 48rem, a table above — a container
 * query on the list's own wrapper, not the window: next to the sidebar a
 * laptop leaves less room than a tablet.
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
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminLeadView | null>(null);

  function openLead(lead: AdminLeadView) {
    setSelected(lead);
    setOpen(true);
  }

  function hrefFor(next: number): string {
    const sp = new URLSearchParams(params.toString());
    if (next <= 1) sp.delete("page");
    else sp.set("page", String(next));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex flex-col gap-4">
      <LeadFilters basePath={basePath} />

      <p className="text-sm text-muted">
        Намерени: <span className="font-bold text-ink">{total}</span>
      </p>

      {leads.length === 0 ? (
        <AdminEmptyState title="Няма заявки за този филтър." />
      ) : (
        <div className="@container">
          <ul className="m-0 grid list-none gap-2 p-0 @xl:grid-cols-2 @3xl:hidden">
            {leads.map((lead) => (
              <li key={lead.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => openLead(lead)}
                  className="flex size-full flex-col gap-2 rounded-xl border border-line bg-white p-4 text-left transition-colors hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:bg-[#fafafa]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-bold wrap-anywhere text-ink">{lead.cells[0]}</span>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <dl className="m-0 flex flex-col gap-1 text-sm">
                    {columns.slice(1).map((col, i) => (
                      <div key={col} className="flex justify-between gap-3">
                        <dt className="shrink-0 text-muted">{col}</dt>
                        <dd className="m-0 min-w-0 text-right wrap-anywhere text-ink">{lead.cells[i + 1]}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted">Получено</dt>
                      <dd className="m-0 text-right text-muted">{lead.createdAt}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-line bg-white @3xl:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  {columns.map((c) => (
                    <th key={c} scope="col" className="px-4 py-3 font-bold">
                      {c}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 font-bold">
                    Получено
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  // The row opens the lead for a mouse; the first cell's button is
                  // the same action for the keyboard and screen readers.
                  <tr
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className="cursor-pointer border-b border-line/60 align-top transition-colors last:border-0 hover:bg-[#fafafa]"
                  >
                    {lead.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 wrap-anywhere ${i === 0 ? "font-semibold text-ink" : "text-muted"}`}
                      >
                        {i === 0 ? (
                          <button
                            type="button"
                            onClick={() => openLead(lead)}
                            className="text-left font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            {cell}
                          </button>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{lead.createdAt}</td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminPagination page={page} pageCount={pageCount} hrefFor={hrefFor} />

      <LeadDetailDrawer
        lead={selected}
        open={open}
        onOpenChange={setOpen}
        // Clear only once the drawer has animated out, so it doesn't empty mid-slide.
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setSelected(null);
        }}
      />
    </div>
  );
}
