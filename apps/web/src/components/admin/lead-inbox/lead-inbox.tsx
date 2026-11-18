"use client";

import { LeadFilters } from "@/components/admin/lead-filters";
import { LeadStatusBadge } from "@/components/admin/lead-status-badge";
import { AdminEmptyState, AdminPagination } from "@/components/admin/ui";
import { InboxIcon } from "@/components/icons";
import type { AdminLeadCell, AdminLeadColumn, AdminLeadView } from "@/types/admin.type";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { LeadValue } from "./lead-value";

function Cell({ cell }: { cell: AdminLeadCell }) {
  if (cell.mono) return <span className="sa-mono">{cell.text}</span>;
  return <LeadValue text={cell.text} make={cell.make} market={cell.market} />;
}

/**
 * The generic lead inbox (boards `ad-carfax`, `ad-inquiries`, `ad-offers` and their states; parity check
 * docs/design/parity/admin-leads.md): filter bar + a list of leads + a detail drawer, plus pagination. Type-agnostic —
 * the server maps each lead type's rows to the shared `AdminLeadView` (compact `cells` aligned to `columns`, the
 * drawer's field lists). Opening a lead shows the drawer where status/notes are edited.
 *
 * Cards while the list is narrower than 48rem, a table above — a container query on the list's own wrapper, not the
 * window: next to the sidebar a laptop leaves less room than a tablet. (The boards switch at a 1100 px window, which
 * with the sidebar is the same width.)
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
  columns: AdminLeadColumn[];
  leads: AdminLeadView[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminLeadView | null>(null);
  // The drawer stays open across a refresh (a status change, saved notes), so
  // show the refreshed row when the list still has it
  // (keeping the status chosen here, which may be newer than the list).
  const fresh = selected && leads.find((l) => l.type === selected.type && l.id === selected.id);
  const shown = selected ? { ...(fresh ?? selected), status: selected.status } : null;

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
    <div className="flex flex-col gap-5">
      <LeadFilters basePath={basePath} />

      <p className="ad-count">
        Намерени: <b>{total}</b>
      </p>

      {leads.length === 0 ? (
        <AdminEmptyState title="Няма заявки за този филтър." icon={<InboxIcon />} />
      ) : (
        <div className="@container">
          <ul className="ad-grid @3xl:hidden">
            {leads.map((lead) => (
              <li key={lead.id} className="min-w-0">
                <button type="button" onClick={() => openLead(lead)} className="ad-lc">
                  <span className="ad-lc__h">
                    <b>{lead.cells[0].text}</b>
                    <LeadStatusBadge status={lead.status} />
                  </span>
                  <dl>
                    {columns.slice(1).map((col, i) => (
                      <div key={col.label}>
                        <dt>{col.label}</dt>
                        <dd>
                          <Cell cell={lead.cells[i + 1]} />
                        </dd>
                      </div>
                    ))}
                    <div>
                      <dt>Получено</dt>
                      <dd className="is-dim">{lead.createdAt}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          <div className="sa-tbl-wrap hidden @3xl:block">
            <table className="sa-tbl">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} scope="col" className={c.num ? "num" : undefined}>
                      {c.label}
                    </th>
                  ))}
                  <th scope="col">Получено</th>
                  <th scope="col">Статус</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  // The row opens the lead for a mouse; the first cell's button is
                  // the same action for the keyboard and screen readers.
                  <tr
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className={`cursor-pointer ${open && shown?.type === lead.type && shown.id === lead.id ? "ad-tr-sel" : ""}`}
                  >
                    {lead.cells.map((cell, i) =>
                      i === 0 ? (
                        <td key={i}>
                          <button type="button" onClick={() => openLead(lead)} className="ad-link">
                            {cell.text}
                          </button>
                        </td>
                      ) : (
                        // A VIN stays on one line (the name and the car wrap instead); an amount is right-aligned.
                        <td key={i} className={columns[i]?.num ? "num" : cell.mono ? "ad-dim ad-nowrap" : "ad-dim wrap-anywhere"}>
                          <Cell cell={cell} />
                        </td>
                      ),
                    )}
                    <td className="ad-dim ad-nowrap">{lead.createdAt}</td>
                    <td>
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
        lead={shown}
        open={open}
        onOpenChange={setOpen}
        // A lead the current filter no longer lists keeps its new status here.
        onStatusChanged={(status) => setSelected((prev) => (prev ? { ...prev, status } : prev))}
        // Clear only once the drawer has animated out, so it doesn't empty mid-slide.
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setSelected(null);
        }}
      />
    </div>
  );
}
