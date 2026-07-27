import { LeadInbox } from "@/components/admin";
import { requireAdminPage } from "@/lib/admin";
import { LEAD_TYPE_META } from "@/constants/admin";
import { CALCULATOR_COLUMNS, toCalculatorView } from "@/lib/admin-lead-view";
import { parseLeadFilters, type LeadSearchParams } from "@/lib/admin-lead-filters";
import { listCalculatorOffers } from "@/queries/admin";

/**
 * /admin/oferti — the /kalkulator gated-offer lead inbox over `calculator_offers`.
 * The drawer renders each lead's stored `breakdown_json` (the exact estimate the
 * visitor received). The layout gates the route to admins.
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
    <div>
      <h1 className="mb-4 text-2xl font-black tracking-tight text-ink">
        {LEAD_TYPE_META.calculator.label}
      </h1>
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
