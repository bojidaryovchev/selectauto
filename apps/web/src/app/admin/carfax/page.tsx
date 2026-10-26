import type { Metadata } from "next";
import { LeadInbox } from "@/components/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { CARFAX_COLUMNS, toCarfaxView } from "@/lib/admin-lead-view";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { listCarfaxRequests } from "@/queries/admin";

export const metadata: Metadata = { title: LEAD_TYPE_META.carfax.label };

/**
 * /admin/carfax — the Carfax / VIN-report lead inbox. Reads the URL filters
 * (status/q/page), queries one page of `carfax_requests`, maps each row to the
 * shared AdminLeadView, and hands it to the generic <LeadInbox>.
 * `requireAdminPage()` is the gate — the /admin layout (and the proxy) only
 * require back-office access, which observers have too.
 */
export default async function AdminCarfaxPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const { rows, total, page, pageCount } = await listCarfaxRequests(filters);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title={LEAD_TYPE_META.carfax.label} />
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
