import type { Metadata } from "next";
import { LeadInbox } from "@/components/admin";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { CALCULATOR_COLUMNS, toCalculatorView } from "@/lib/admin-lead-view";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { listCalculatorOffers } from "@/queries/admin";

export const metadata: Metadata = { title: LEAD_TYPE_META.calculator.label };

/**
 * /admin/oferti — the /kalkulator gated-offer lead inbox over `calculator_offers`.
 * The drawer renders each lead's stored `breakdown_json` (the exact estimate the
 * visitor received). `requireAdminPage()` is the gate — the /admin layout (and
 * the proxy) only require back-office access.
 */
export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<LeadSearchParams>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const { rows, total, page, pageCount } = await listCalculatorOffers(filters);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title={LEAD_TYPE_META.calculator.label} />
      <LeadInbox
        basePath={LEAD_TYPE_META.calculator.href}
        columns={CALCULATOR_COLUMNS}
        leads={rows.map(toCalculatorView)}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </div>
  );
}
