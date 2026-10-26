import { auth } from "@/auth";
import { ContractFilters, ContractList, NoticesToSend, NumberingSettings } from "@/components/admin/contracts";
import { AdminButtonLink, AdminEmptyState, AdminPageHeader, AdminPagination } from "@/components/admin/ui";
import { can } from "@/lib/admin";
import { getNumbering, listContracts, listNoticesToSend } from "@/queries/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Договори" };

/**
 * /admin/dogovori — the mediation-contracts register (spec §4/§11): one row per
 * contract with №, client, car, total and the four stage-status chips (the old
 * workoffice's green stage dropdowns, as statuses). Filters ride the URL; the
 * layout gates the route to the back office, and listContracts shows only the
 * contracts the user may see.
 */
export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { rows, total, page, pageCount } = await listContracts({
    q: sp.q,
    status: sp.status,
    page: Math.max(1, Number(sp.page) || 1),
  });
  const session = await auth();
  // Numbering belongs to `contracts.edit` — an observer never sees or edits it.
  // The „за изпращане" list is the work queue of whoever forwards notices; the
  // one who issues them sees it read-only, to follow what is still unsent.
  const canMarkSent = can(session, "notices.markSent");
  const [numbering, toSend] = await Promise.all([
    can(session, "contracts.edit") ? getNumbering("contract") : null,
    canMarkSent || can(session, "notices.generate") ? listNoticesToSend() : [],
  ]);

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (sp.q) qs.set("q", sp.q);
    if (sp.status) qs.set("status", sp.status);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/admin/dogovori?${s}` : "/admin/dogovori";
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Договори"
        description={`Договори за посредничество — общо ${total}.`}
        actions={
          can(session, "contracts.create") ? (
            <AdminButtonLink href="/admin/dogovori/nov" variant="primary" size="lg">
              + Нов договор
            </AdminButtonLink>
          ) : null
        }
      />

      {numbering ? <NumberingSettings numbering={numbering} /> : null}

      {toSend.length > 0 ? <NoticesToSend notices={toSend} canMarkSent={canMarkSent} /> : null}

      <ContractFilters q={sp.q} status={sp.status} />

      {rows.length > 0 ? (
        <ContractList rows={rows} />
      ) : (
        <AdminEmptyState title={sp.q || sp.status ? "Няма договори по зададените филтри." : "Няма договори."}>
          {can(session, "contracts.create") ? "Създайте първия с „+ Нов договор“." : null}
        </AdminEmptyState>
      )}

      <AdminPagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
    </div>
  );
}
