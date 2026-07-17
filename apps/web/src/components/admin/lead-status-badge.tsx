import { LEAD_STATUS_META, type LeadStatus } from "@/constants/admin";

/**
 * Presentational status pill (BG label + palette from LEAD_STATUS_META). Plain
 * component — usable from both server (dashboard) and client (inbox) trees.
 */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
