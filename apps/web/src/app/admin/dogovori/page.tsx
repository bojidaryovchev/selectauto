import Link from "next/link";
import { auth } from "@/auth";
import { ContractFilters, NumberingSettings, PaymentStatusBadge } from "@/components/admin/contracts";
import { isAdmin } from "@/lib/admin";
import { getNumbering } from "@/queries/contracts";
import {
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  PAYMENT_STAGE_META,
  PAYMENT_STAGES,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { formatDbAmount } from "@/lib/money";
import { listContracts } from "@/queries/contracts";

/**
 * /admin/dogovori — the mediation-contracts register (spec §4/§11): one row per
 * contract with №, client, car, total and the four stage-status chips (the old
 * workoffice's green stage dropdowns, as statuses). Filters ride the URL; the
 * layout gates the route to admins.
 */
export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageCount } = await listContracts({ q: sp.q, status: sp.status, page });
  // Numbering is an admin-only setting — an observer never sees or edits it.
  const admin = isAdmin(await auth());
  const numbering = admin ? await getNumbering("contract") : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Договори</h1>
          <p className="text-sm text-muted">Договори за посредничество — общо {total}.</p>
        </div>
        <Link
          href="/admin/dogovori/nov"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        >
          + Нов договор
        </Link>
      </div>

      {numbering ? <NumberingSettings numbering={numbering} /> : null}

      <ContractFilters q={sp.q} status={sp.status} />

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">№ / Дата</th>
              <th className="px-4 py-3 font-semibold">Клиент</th>
              <th className="px-4 py-3 font-semibold">Автомобил</th>
              <th className="px-4 py-3 font-semibold">Пазар</th>
              <th className="px-4 py-3 font-semibold">Обща сума</th>
              <th className="px-4 py-3 font-semibold">Плащания</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ contract, clientName, stages }) => {
              const statusMeta = CONTRACT_STATUS_META[contract.status as ContractStatus];
              // The WHOLE row opens the contract: the number stays a real <Link>
              // (so middle-click / "open in new tab" still work) and its ::after
              // is stretched over the positioned row — no JS, no wrapper.
              return (
                <tr
                  key={contract.id}
                  className="relative border-b border-line align-top last:border-0 hover:bg-neutral-50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/admin/dogovori/${contract.id}`}
                      className="font-bold text-brand after:absolute after:inset-0 after:content-[''] hover:underline"
                    >
                      {contract.number}
                    </Link>
                    <div className="text-xs text-muted">{contract.contractDate}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{clientName}</td>
                  <td className="px-4 py-3">
                    <div className="text-ink">
                      {contract.carYear} {contract.carMake} {contract.carModel}
                    </div>
                    {contract.vin ? <div className="font-mono text-xs text-muted">{contract.vin}</div> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {CONTRACT_MARKET_META[contract.market as ContractMarket]?.label ?? contract.market}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                    {formatDbAmount(contract.totalAmount)} {contract.currency}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {PAYMENT_STAGES.map((s) =>
                        stages[s] ? (
                          <PaymentStatusBadge key={s} status={stages[s]!} prefix={PAYMENT_STAGE_META[s].label} />
                        ) : null,
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {statusMeta ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  Няма договори{sp.q || sp.status ? " по зададените филтри" : ""}. Създайте първия с „+ Нов договор“.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/admin/dogovori", query: { ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), page: p } }}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                p === page ? "bg-brand/10 text-brand" : "text-muted hover:bg-neutral-100"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
