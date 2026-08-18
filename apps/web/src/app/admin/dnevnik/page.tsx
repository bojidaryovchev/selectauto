import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { listAuditEvents } from "@/queries/admin";
import { auditActionLabel, auditEntityLabel } from "@/constants/audit";

/**
 * /admin/dnevnik — the global audit log.
 *
 * `contract_events` has always been written by more than contracts (role
 * changes, and now paid de-listings) but was only ever RENDERED on a single
 * contract's page, so most rows were invisible. For a service the business
 * charges for, an audit trail nobody can read is not an audit trail.
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

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`h-9 shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-brand text-white" : "border border-line bg-white text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Дневник</h1>
      <p className="mb-4 text-sm text-muted">
        Всички действия в панела — договори, плащания, роли и скрити обяви.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {chip("/admin/dnevnik", "Всички", !sp.entity)}
        {entities.map((e) =>
          chip(`/admin/dnevnik?entity=${encodeURIComponent(e)}`, auditEntityLabel(e), sp.entity === e),
        )}
      </div>

      <p className="mb-2 text-sm text-muted">
        Намерени: <span className="font-bold text-ink">{total}</span>
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center text-muted">
          Няма записи.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-184 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-bold">Дата</th>
                <th className="px-4 py-3 font-bold">Обект</th>
                <th className="px-4 py-3 font-bold">Действие</th>
                <th className="px-4 py-3 font-bold">Потребител</th>
                <th className="px-4 py-3 font-bold">Детайли</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-line/60 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(e.createdAt).toLocaleString("bg-BG")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">
                    {auditEntityLabel(e.entity)}
                    {/* entity_id 0 is the repo's "not a real row" sentinel. */}
                    {e.entityId > 0 ? <span className="text-muted"> #{e.entityId}</span> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{auditActionLabel(e.action)}</td>
                  <td className="wrap-break-word px-4 py-3 text-muted">{e.actorEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {e.data ? (
                      <code className="wrap-break-word whitespace-pre-wrap">
                        {JSON.stringify(e.data)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <PageLink page={page - 1} disabled={page <= 1} entity={sp.entity} label="Назад" />
          <span className="text-sm text-muted">
            Страница {page} от {pageCount}
          </span>
          <PageLink page={page + 1} disabled={page >= pageCount} entity={sp.entity} label="Напред" />
        </div>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  entity,
  label,
}: {
  page: number;
  disabled: boolean;
  entity?: string;
  label: string;
}) {
  const cls = "h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink";
  if (disabled) return <span className={`${cls} opacity-40`}>{label}</span>;
  const sp = new URLSearchParams();
  if (entity) sp.set("entity", entity);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return (
    <Link href={qs ? `/admin/dnevnik?${qs}` : "/admin/dnevnik"} className={cls}>
      {label}
    </Link>
  );
}
