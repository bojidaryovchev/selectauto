import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractAdminTools, ContractDocumentButton, ContractForm } from "@/components/admin/contracts";
import { PaymentStageCard } from "@/components/admin/contracts/payment-stage-card";
import {
  CLIENT_KIND_META,
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  type ClientKind,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { auditActionLabel } from "@/constants/audit";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { dbToCents, formatDbAmount } from "@/lib/money";
import { getContract } from "@/queries/contracts";
import { listRecipients } from "@/queries/recipients";

// Audit-trail labels now live in `constants/audit.ts`, shared with the global
// log at /admin/dnevnik — two copies would drift the moment a new action is
// added, and the one on this page would be the copy nobody remembers to update.

/**
 * /admin/dogovori/[id] — the contract detail (spec §4): head data, client, the
 * five points, the FOUR payment-stage cards with status/recipient/остатък, the
 * linked deposit, the audit trail, and an inline edit form. Notice generation
 * and mark-as-paid actions attach to the stage cards in the next phases. The
 * layout gates the route to admins.
 */
export default async function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, allRecipients, session] = await Promise.all([getContract(Number(id)), listRecipients(), auth()]);
  if (!detail) notFound();
  // Editing the contract, issuing notices and recording payments are admin-only
  // (owner spec 07.2026); „Наблюдаващ" follows everything read-only.
  const canManage = isAdmin(session);
  const { contract, client, payments, deposit, documents, attachments, events } = detail;
  const activeRecipients = allRecipients.filter((r) => r.active);

  const statusMeta = CONTRACT_STATUS_META[contract.status as ContractStatus];
  // The пера are whatever this market defines (5 / 4 / 3), not a fixed five.
  const marketMeta = CONTRACT_MARKET_META[contract.market as ContractMarket];
  const points = (marketMeta?.points ?? []).map((p) => ({
    label: p.label,
    value: contract[p.key],
    foreignCurrency: p.foreignCurrency,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* ── Head ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-ink">Договор № {contract.number}</h1>
            {statusMeta ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {CONTRACT_MARKET_META[contract.market as ContractMarket]?.label} ({contract.currency}) · Дата:{" "}
            {contract.contractDate}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/admin/dogovori" className="text-sm font-semibold text-muted hover:text-ink">
            ← Всички договори
          </Link>
          {canManage ? (
            <ContractDocumentButton
              contractId={contract.id}
              documents={documents.filter((d) => d.kind === "contract")}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Клиент ── */}
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-black text-ink">Клиент</h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div>
              <dt className="inline font-semibold text-muted">Тип: </dt>
              <dd className="inline text-ink">{CLIENT_KIND_META[client.kind as ClientKind]?.label ?? client.kind}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-muted">{client.kind === "company" ? "Фирма: " : "Име: "}</dt>
              <dd className="inline font-semibold text-ink">{client.name}</dd>
            </div>
            {client.egn ? (
              <div>
                <dt className="inline font-semibold text-muted">ЕГН: </dt>
                <dd className="inline text-ink">{client.egn}</dd>
              </div>
            ) : null}
            {client.eik ? (
              <div>
                <dt className="inline font-semibold text-muted">ЕИК: </dt>
                <dd className="inline text-ink">{client.eik}</dd>
              </div>
            ) : null}
            {client.vatNumber ? (
              <div>
                <dt className="inline font-semibold text-muted">ДДС №: </dt>
                <dd className="inline text-ink">{client.vatNumber}</dd>
              </div>
            ) : null}
            {client.representative ? (
              <div>
                <dt className="inline font-semibold text-muted">Представител: </dt>
                <dd className="inline text-ink">{client.representative}</dd>
              </div>
            ) : null}
            {client.address ? (
              <div>
                <dt className="inline font-semibold text-muted">Адрес: </dt>
                <dd className="inline text-ink">{client.address}</dd>
              </div>
            ) : null}
            {client.phone ? (
              <div>
                <dt className="inline font-semibold text-muted">Телефон: </dt>
                <dd className="inline text-ink">{client.phone}</dd>
              </div>
            ) : null}
            {client.email ? (
              <div>
                <dt className="inline font-semibold text-muted">Имейл: </dt>
                <dd className="inline text-ink">{client.email}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {/* ── Автомобил ── */}
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-black text-ink">Автомобил</h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div>
              <dd className="font-semibold text-ink">
                {contract.carYear} {contract.carMake} {contract.carModel}
              </dd>
            </div>
            {contract.vin ? (
              <div>
                <dt className="inline font-semibold text-muted">VIN: </dt>
                <dd className="inline font-mono text-ink">{contract.vin}</dd>
              </div>
            ) : null}
            {contract.purchaseMarket ? (
              <div>
                <dt className="inline font-semibold text-muted">Пазар: </dt>
                <dd className="inline text-ink">{contract.purchaseMarket}</dd>
              </div>
            ) : null}
            {contract.auctionPlatform ? (
              <div>
                <dt className="inline font-semibold text-muted">Търг: </dt>
                <dd className="inline text-ink">{contract.auctionPlatform}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {/* ── Суми ── */}
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-black text-ink">Финансови точки</h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            {points.map((p) => (
              <div key={p.label} className="flex justify-between gap-2">
                <dt className="text-muted">{p.label}</dt>
                <dd className="whitespace-nowrap text-right font-semibold text-ink">
                  {formatDbAmount(p.value)} {contract.currency}
                  {p.foreignCurrency && contract.amountCarForeign ? (
                    <div className="text-xs font-normal text-muted">
                      ({formatDbAmount(contract.amountCarForeign)} {contract.foreignCurrency} × курс{" "}
                      {contract.foreignRate})
                    </div>
                  ) : null}
                </dd>
              </div>
            ))}
            {dbToCents(contract.depositDeduction) > 0 && deposit ? (
              <div className="flex justify-between gap-2 text-brand">
                <dt>Депозит № {deposit.number}</dt>
                <dd className="whitespace-nowrap font-semibold">
                  −{formatDbAmount(contract.depositDeduction)} {contract.currency}
                </dd>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between gap-2 border-t border-line pt-2">
              <dt className="font-bold text-ink">Обща сума</dt>
              <dd className="whitespace-nowrap text-base font-black text-ink">
                {formatDbAmount(contract.totalAmount)} {contract.currency}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* ── Плащания ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-ink">Плащания</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {payments.map((p) => (
            <PaymentStageCard
              key={p.id}
              payment={p}
              contract={{
                id: contract.id,
                number: contract.number,
                market: contract.market,
                currency: contract.currency,
                status: contract.status,
              }}
              recipients={activeRecipients}
              documents={documents.filter((d) => d.paymentId === p.id && d.kind === "payment_notice")}
              attachments={attachments.filter((a) => a.paymentId === p.id)}
              canManage={canManage}
            />
          ))}
        </div>
      </section>

      {/* ── Редакция (само админ) ── */}
      {!canManage ? null : (
      <details className="rounded-xl border border-line bg-white">
        <summary className="cursor-pointer select-none px-5 py-4 text-lg font-black text-ink">
          Редакция на договора
        </summary>
        <div className="border-t border-line p-5">
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Промените обновяват дължимите суми на неплатените етапи. Вече генерирани документи НЕ се променят — при
            нужда се генерира нова версия. Клиентът и приспаднатият депозит не се променят след създаване.
          </p>
          <ContractForm contract={contract} />
        </div>
      </details>
      )}

      {/* ── Административни действия (номер / изтриване) ── */}
      {canManage ? (
        <ContractAdminTools
          contractId={contract.id}
          number={contract.number}
          status={contract.status}
          documentCount={documents.length}
        />
      ) : null}

      {/* ── История ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-ink">История</h2>
        <div className="rounded-xl border border-line bg-white">
          {events.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Няма записани събития.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <span className="whitespace-nowrap font-mono text-xs text-muted">
                    {e.createdAt.toLocaleString("bg-BG")}
                  </span>
                  <span className="font-semibold text-ink">{auditActionLabel(e.action)}</span>
                  <span className="text-muted">
                    {e.entity === "payment" ? "(плащане)" : e.entity === "deposit" ? "(депозит)" : e.entity === "client" ? "(клиент)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
