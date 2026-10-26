import { AdminEmptyState, AdminPageHeader, AdminPagination, adminChipClass } from "@/components/admin/ui";
import { auditActionLabel, auditEntityLabel } from "@/constants/audit";
import { requireAdminPage } from "@/lib/admin";
import { auditDetails, auditEntityHref } from "@/lib/audit-details";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { type AuditEventRow, listAuditEvents } from "@/queries/admin";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Дневник" };

/**
 * /admin/dnevnik — the global audit log.
 *
 * `contract_events` has always been written by more than contracts (role
 * changes, and now paid de-listings) but was only ever RENDERED on a single
 * contract's page, so most rows were invisible. For a service the business
 * charges for, an audit trail nobody can read is not an audit trail. Each row
 * reads as label/value lines and links to its record while that still exists.
 *
 * Read-only and admin-only.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;

  const { rows, total, page, pageCount, entities } = await listAuditEvents({
    page: Number(sp.page) || 1,
    entity: sp.entity,
  });

  const hrefFor = (p: number, entity = sp.entity) => {
    const q = new URLSearchParams();
    if (entity) q.set("entity", entity);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `/admin/dnevnik?${qs}` : "/admin/dnevnik";
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Дневник"
        description="Действията по договори, плащания, депозити, клиенти, получатели, роли, номерация, скрити обяви и обяви в mobile.bg — кой, кога и какво. Запитванията, пощата и тарифите не се записват тук."
      />

      <nav aria-label="Филтър по обект" className="flex flex-wrap gap-2">
        <Link
          href={hrefFor(1, "")}
          aria-current={!sp.entity ? "true" : undefined}
          className={adminChipClass(!sp.entity)}
        >
          Всички
        </Link>
        {entities.map((entity) => (
          <Link
            key={entity}
            href={hrefFor(1, entity)}
            aria-current={sp.entity === entity ? "true" : undefined}
            className={adminChipClass(sp.entity === entity)}
          >
            {auditEntityLabel(entity)}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted">
        Намерени: <span className="font-bold text-ink">{total}</span>
      </p>

      {rows.length === 0 ? (
        <AdminEmptyState title="Няма записи." />
      ) : (
        <div className="@container">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 @4xl:hidden">
            {rows.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-bold text-ink">{auditActionLabel(e.action)}</span>
                  <span className="text-xs text-muted">{formatSofiaDateTime(e.createdAt)}</span>
                </div>
                <Entity row={e} />
                <span className="text-xs wrap-anywhere text-muted">{e.actorEmail ?? "—"}</span>
                <Details row={e} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-line bg-white @4xl:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="w-px px-4 py-3 font-bold whitespace-nowrap">Дата</th>
                  <th className="px-4 py-3 font-bold">Обект</th>
                  <th className="px-4 py-3 font-bold">Действие</th>
                  <th className="px-4 py-3 font-bold">Потребител</th>
                  <th className="px-4 py-3 font-bold">Детайли</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatSofiaDateTime(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Entity row={e} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{auditActionLabel(e.action)}</td>
                    <td className="max-w-56 px-4 py-3 wrap-anywhere text-muted">{e.actorEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Details row={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminPagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </div>
  );
}

/** „Договор #74", linked to the record while it still exists. entity_id 0 is the repo's „no row" sentinel. */
function Entity({ row }: { row: AuditEventRow }) {
  const label = (
    <>
      {auditEntityLabel(row.entity)}
      {row.entityId > 0 ? <span className="text-muted"> #{row.entityId}</span> : null}
    </>
  );
  const link = auditEntityHref(row);
  if (!link) return <span className="text-ink">{label}</span>;
  // Padding grows the tap target to 40 px; the negative margin keeps the line where it was.
  const cls = "-my-2.5 inline-block self-start py-2.5 font-semibold text-brand hover:underline";
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={cls}>
      {label}
    </a>
  ) : (
    <Link href={link.href} prefetch={false} className={cls}>
      {label}
    </Link>
  );
}

function Details({ row }: { row: AuditEventRow }) {
  const details = auditDetails(row.entity, row.action, row.data);
  if (details.length === 0) return <span className="text-muted">—</span>;
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
      {details.map((d, i) => (
        <div key={i} className="contents">
          <dt className="text-muted">{d.label}</dt>
          <dd className="wrap-anywhere text-ink">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}
