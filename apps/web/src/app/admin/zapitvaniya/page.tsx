import type { Metadata } from "next";
import { LeadInbox } from "@/components/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { INQUIRY_COLUMNS, toInquiryView } from "@/lib/admin-lead-view";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { listInquiries } from "@/queries/admin";

export const metadata: Metadata = { title: LEAD_TYPE_META.inquiry.label };

/**
 * /admin/zapitvaniya — the "Безплатна консултация" lead inbox. Same shape as the
 * Carfax inbox over the `inquiries` table. `requireAdminPage()` is the gate — the
 * /admin layout (and the proxy) only require back-office access.
 */
export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const { rows, total, page, pageCount } = await listInquiries(filters);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title={LEAD_TYPE_META.inquiry.label} />
      <LeadInbox
        basePath={LEAD_TYPE_META.inquiry.href}
        columns={INQUIRY_COLUMNS}
        leads={rows.map(toInquiryView)}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </div>
  );
}
