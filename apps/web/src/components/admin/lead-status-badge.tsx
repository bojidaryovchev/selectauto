import { LEAD_STATUS_META, type LeadStatus } from "@/constants/admin";

/**
 * A lead's status as the kit's tag with its dot (boards `ad-carfax`, `ad-inquiries`, `ad-offers`): Ново amber, В процес
 * blue, Спечелено green, Загубено red, Архив neutral (`LEAD_STATUS_META[status].tone`). Plain component — usable from
 * both server and client trees.
 */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, tone } = LEAD_STATUS_META[status];
  return (
    <span className={tone ? `sa-tag shrink-0 sa-tag--${tone}` : "sa-tag shrink-0"}>
      <span className={tone ? `sa-dot sa-dot--${tone}` : "sa-dot"} aria-hidden="true" />
      {label}
    </span>
  );
}
