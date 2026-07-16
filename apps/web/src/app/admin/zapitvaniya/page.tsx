import { LeadInbox } from "@/components/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { INQUIRY_COLUMNS, toInquiryView } from "@/lib/admin-lead-view";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { listInquiries } from "@/queries/admin";

/**
 * /admin/zapitvaniya — the "Безплатна консултация" lead inbox. Same shape as the
 * Carfax inbox over the `inquiries` table. The layout gates the route to admins.
 */
export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const { rows, total, page, pageCount } = await listInquiries(filters);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black tracking-tight text-ink">
        {LEAD_TYPE_META.inquiry.label}
      </h1>
      <LeadInbox
        type="inquiry"
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
