import { AdminEmptyState, AdminPageHeader, AdminPagination, adminChipClass } from "@/components/admin/ui";
import { ClockIcon, ExternalLinkIcon } from "@/components/icons";
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
 * Read-only and admin-only. Boards `ad-log` and its states; parity check
 * docs/design/parity/admin-log.md.
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
    <>
      <AdminPageHeader
        title="Дневник"
        description="Действията по договори, плащания, депозити, клиенти, получатели, роли, номерация, скрити обяви и обяви в mobile.bg — кой, кога и какво. Запитванията, пощата и тарифите не се записват тук."
      />

      <nav aria-label="Филтър по обект" className="sa-chips">
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

      <p className="bo-count">
        Намерени: <b>{total}</b>
      </p>

      {rows.length === 0 ? (
        <AdminEmptyState icon={<ClockIcon />} title="Няма записи." />
      ) : (
        <div className="@container">
          <ul className="bo-lgs @4xl:hidden">
            {rows.map((e) => (
              <li key={e.id} className="bo-lg">
                <div className="bo-lg__h">
                  <b>{auditActionLabel(e.action)}</b>
                  <time dateTime={e.createdAt.toISOString()}>{formatSofiaDateTime(e.createdAt)}</time>
                </div>
                <Entity row={e} />
                <span className="bo-actor">{e.actorEmail ?? "—"}</span>
                <Details row={e} />
              </li>
            ))}
          </ul>

          <div className="sa-tbl-wrap hidden @4xl:block">
            <table className="sa-tbl bo-tbl">
              <thead>
                <tr>
                  <th scope="col">Дата</th>
                  <th scope="col">Обект</th>
                  <th scope="col">Действие</th>
                  <th scope="col">Потребител</th>
                  <th scope="col">Детайли</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="bo-dim bo-nowrap">{formatSofiaDateTime(e.createdAt)}</td>
                    <td>
                      <Entity row={e} />
                    </td>
                    <td>
                      <b>{auditActionLabel(e.action)}</b>
                    </td>
                    <td className="bo-dim max-w-56 wrap-anywhere">{e.actorEmail ?? "—"}</td>
                    <td>
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
    </>
  );
}

/** „Договор #74", linked to the record while it still exists. entity_id 0 is the repo's „no row" sentinel. */
function Entity({ row }: { row: AuditEventRow }) {
  const label = (
    <>
      {auditEntityLabel(row.entity)}
      {row.entityId > 0 ? (
        <>
          {" "}
          <span className="bo-id">#{row.entityId}</span>
        </>
      ) : null}
    </>
  );
  const link = auditEntityHref(row);
  if (!link) return <span className="bo-ent">{label}</span>;
  // Padding grows the tap target to 40 px; the negative margin keeps the line where it was.
  const cls = "bo-ent -my-2.5 py-2.5 hover:underline";
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={cls}>
      {label}
      <ExternalLinkIcon />
    </a>
  ) : (
    <Link href={link.href} prefetch={false} className={cls}>
      {label}
    </Link>
  );
}

function Details({ row }: { row: AuditEventRow }) {
  const details = auditDetails(row.entity, row.action, row.data, { market: row.contractMarket });
  if (details.length === 0) return <span className="bo-dim">—</span>;
  return (
    <dl className="bo-kv">
      {details.map((d, i) => (
        <div key={i}>
          <dt>{d.label}</dt>
          <dd>{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}
