import { LeadInbox } from "@/components/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { CARFAX_COLUMNS, toCarfaxView } from "@/lib/admin-lead-view";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { listCarfaxRequests } from "@/queries/admin";

/**
 * /admin/carfax — the Carfax / VIN-report lead inbox. Reads the URL filters
 * (status/q/page), queries one page of `carfax_requests`, maps each row to the
 * shared AdminLeadView, and hands it to the generic <LeadInbox>. The layout gates
 * the route to admins.
 */
export default async function AdminCarfaxPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const { rows, total, page, pageCount } = await listCarfaxRequests(filters);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black tracking-tight text-ink">
        {LEAD_TYPE_META.carfax.label}
      </h1>
      <LeadInbox
        basePath={LEAD_TYPE_META.carfax.href}
        columns={CARFAX_COLUMNS}
        leads={rows.map(toCarfaxView)}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </div>
  );
}
