import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { ContractFilters, NoticeSentButton, NumberingSettings, PaymentStatusBadge } from "@/components/admin/contracts";
import { can } from "@/lib/admin";
import { getNumbering, listNoticesToSend } from "@/queries/contracts";
import {
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  PAYMENT_STAGE_META,
  PAYMENT_STAGES,
  stageLabel,
  type ContractMarket,
  type ContractStatus,
  type PaymentStage,
} from "@/constants/contracts";
import { formatDbAmount } from "@/lib/money";
import { listContracts } from "@/queries/contracts";

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
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageCount } = await listContracts({ q: sp.q, status: sp.status, page });
  const session = await auth();
  // Numbering belongs to `contracts.edit` — an observer never sees or edits it.
  // The „за изпращане" list is the work queue of whoever forwards notices; the
  // one who issues them sees it read-only, to follow what is still unsent.
  const canMarkSent = can(session, "notices.markSent");
  const [numbering, toSend] = await Promise.all([
    can(session, "contracts.edit") ? getNumbering("contract") : null,
    canMarkSent || can(session, "notices.generate") ? listNoticesToSend() : [],
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-ink">Договори</h1>
          <p className="text-sm text-muted">Договори за посредничество — общо {total}.</p>
        </div>
        {can(session, "contracts.create") ? (
          <Link
            href="/admin/dogovori/nov"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
          >
            + Нов договор
          </Link>
        ) : null}
      </div>

      {numbering ? <NumberingSettings numbering={numbering} /> : null}

      {toSend.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-black text-amber-900">Известия за изпращане към клиента ({toSend.length})</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {toSend.map((n) => (
              <li key={n.documentId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={`/admin/dogovori/${n.contractId}`} className="font-bold text-brand hover:underline">
                  Договор № {n.contractNumber}
                </Link>
                <span className="text-ink">
                  {n.clientName} · {stageLabel(n.market as ContractMarket, n.stage as PaymentStage)} · версия {n.version}{" "}
                  от {n.createdAt.toLocaleDateString("bg-BG", { timeZone: "Europe/Sofia" })}
                </span>
                <a
                  href={`/api/payment-document/${n.documentId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand hover:underline"
                >
                  PDF ⬇
                </a>
                {canMarkSent ? <NoticeSentButton documentId={n.documentId} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
              // The number is the link. No row-wide ::after overlay on a
              // `position: relative` <tr>: Safari before 27 doesn't make a table
              // row a containing block, so every row's overlay covered the whole
              // page and any tap opened the last contract (WebKit bug 240961).
              return (
                <tr key={contract.id} className="border-b border-line align-top last:border-0 hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/admin/dogovori/${contract.id}`} className="font-bold text-brand hover:underline">
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
