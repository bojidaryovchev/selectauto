import { auth } from "@/auth";
import { ContractAdminTools, ContractDocumentButton, ContractForm } from "@/components/admin/contracts";
import { PaymentStageCard } from "@/components/admin/contracts/payment-stage-card";
import { AdminCard, AdminPageHeader } from "@/components/admin/ui";
import { ChevronDownIcon } from "@/components/icons";
import { auditActionLabel } from "@/constants/audit";
import {
  CLIENT_KIND_META,
  CONTRACT_MARKET_META,
  CONTRACT_STATUS_META,
  type ClientKind,
  type ContractMarket,
  type ContractStatus,
} from "@/constants/contracts";
import { can } from "@/lib/admin";
import { dbToCents, formatDbAmount } from "@/lib/money";
import { formatSofiaDateTime } from "@/lib/sofia-time";
import { getContract } from "@/queries/contracts";
import { listRecipients } from "@/queries/recipients";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Договор" };

// Audit-trail labels now live in `constants/audit.ts`, shared with the global
// log at /admin/dnevnik — two copies would drift the moment a new action is
// added, and the one on this page would be the copy nobody remembers to update.

/** One „Етикет: стойност" line of a fact list; long values (e-mail, address) wrap. */
function Fact({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="inline font-semibold text-muted">{label}: </dt>
      <dd className={`inline wrap-anywhere text-ink ${mono ? "font-mono" : ""}`}>{children}</dd>
    </div>
  );
}

/**
 * /admin/dogovori/[id] — the contract detail (spec §4): head data, client, the
 * market's пера, one card per payment stage with status/recipient/остатък and
 * its notice, payment and attachment actions, the linked deposit, the audit
 * trail, and an inline edit form. The layout gates the route to the back
 * office; getContract 404s a contract the user may not see.
 *
 * Grids follow the width of the content column (container queries), not the
 * window: next to the sidebar, a 1 280 px screen leaves less room than a tablet.
 */
export default async function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, allRecipients, session] = await Promise.all([getContract(Number(id)), listRecipients(), auth()]);
  if (!detail) notFound();
  // Each action shows only with its capability (owner spec 07.2026: „Наблюдаващ"
  // follows everything read-only, attaching bank documents aside).
  const canEdit = can(session, "contracts.edit");
  const stageActions = {
    issueNotices: can(session, "notices.generate"),
    recordPayments: can(session, "payments.record"),
    attach: can(session, "payments.attach"),
    markSent: can(session, "notices.markSent"),
  };
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
      <AdminPageHeader
        back={{ href: "/admin/dogovori", label: "Всички договори" }}
        title={`Договор № ${contract.number}`}
        badge={
          statusMeta ? (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          ) : null
        }
        description={`${marketMeta?.label ?? contract.market} (${contract.currency}) · Дата: ${contract.contractDate}`}
        // Printing is open to „Наблюдаващ" too — it never edits the contract.
        actions={
          <ContractDocumentButton contractId={contract.id} documents={documents.filter((d) => d.kind === "contract")} />
        }
      />

      <div className="@container">
        <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-3">
          <AdminCard>
            <h2 className="mb-3 text-lg font-black text-ink">Клиент</h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              <Fact label="Тип">{CLIENT_KIND_META[client.kind as ClientKind]?.label ?? client.kind}</Fact>
              <Fact label={client.kind === "company" ? "Фирма" : "Име"}>
                <span className="font-semibold">{client.name}</span>
              </Fact>
              {client.egn ? <Fact label="ЕГН">{client.egn}</Fact> : null}
              {client.eik ? <Fact label="ЕИК">{client.eik}</Fact> : null}
              {client.vatNumber ? <Fact label="ДДС №">{client.vatNumber}</Fact> : null}
              {client.representative ? <Fact label="Представител">{client.representative}</Fact> : null}
              {client.address ? <Fact label="Адрес">{client.address}</Fact> : null}
              {client.phone ? <Fact label="Телефон">{client.phone}</Fact> : null}
              {client.email ? <Fact label="Имейл">{client.email}</Fact> : null}
            </dl>
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 text-lg font-black text-ink">Автомобил</h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div>
                <dd className="font-semibold text-ink">
                  {contract.carYear} {contract.carMake} {contract.carModel}
                </dd>
              </div>
              {contract.vin ? (
                <Fact label="VIN" mono>
                  {contract.vin}
                </Fact>
              ) : null}
              {contract.purchaseMarket ? <Fact label="Пазар">{contract.purchaseMarket}</Fact> : null}
              {contract.auctionPlatform ? <Fact label="Търг">{contract.auctionPlatform}</Fact> : null}
            </dl>
          </AdminCard>

          {/* Two columns: the пера need the room — full width under the other two. */}
          <AdminCard className="@xl:col-span-2 @5xl:col-span-1">
            <h2 className="mb-3 text-lg font-black text-ink">Финансови точки</h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              {points.map((p) => (
                <div key={p.label} className="flex justify-between gap-3">
                  <dt className="min-w-0 text-muted">{p.label}</dt>
                  <dd className="text-right font-semibold whitespace-nowrap text-ink">
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
                <div className="flex justify-between gap-3 text-brand">
                  <dt className="min-w-0">Депозит № {deposit.number}</dt>
                  <dd className="font-semibold whitespace-nowrap">
                    −{formatDbAmount(contract.depositDeduction)} {contract.currency}
                  </dd>
                </div>
              ) : null}
              <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-bold text-ink">Обща сума</dt>
                <dd className="text-base font-black whitespace-nowrap text-ink">
                  {formatDbAmount(contract.totalAmount)} {contract.currency}
                </dd>
              </div>
            </dl>
          </AdminCard>
        </div>
      </div>

      {/* ── Плащания ── one column on a phone, two once there's room; `items-start`
          so a card with an open panel doesn't stretch its neighbour. */}
      <section className="@container flex flex-col gap-3">
        <h2 className="text-lg font-black text-ink">Плащания</h2>
        <div className="grid items-start gap-4 @2xl:grid-cols-2">
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
                foreignCurrency: contract.foreignCurrency,
                amountCarForeign: contract.amountCarForeign,
                depositDeduction: contract.depositDeduction,
              }}
              recipients={activeRecipients}
              documents={documents.filter((d) => d.paymentId === p.id && d.kind === "payment_notice")}
              attachments={attachments.filter((a) => a.paymentId === p.id)}
              actions={stageActions}
            />
          ))}
        </div>
      </section>

      {/* ── Редакция (contracts.edit) ── */}
      {canEdit ? (
        <details className="group rounded-xl border border-line bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-lg font-black text-ink select-none sm:px-5 [&::-webkit-details-marker]:hidden">
            Редакция на договора
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line p-4 sm:p-5">
            <p className="mb-4 max-w-2xl text-sm text-muted">
              Промените обновяват дължимите суми на неплатените етапи. Вече генерирани документи НЕ се променят — при
              нужда се генерира нова версия. Клиентът и приспаднатият депозит не се променят след създаване.
            </p>
            <ContractForm contract={contract} />
          </div>
        </details>
      ) : null}

      {/* ── Административни действия (номер / изтриване) ── */}
      {canEdit ? (
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
            <p className="p-4 text-sm text-muted sm:px-5">Няма записани събития.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-5">
                  <span className="font-mono text-xs whitespace-nowrap text-muted">
                    {formatSofiaDateTime(e.createdAt)}
                  </span>
                  <span className="font-semibold text-ink">{auditActionLabel(e.action)}</span>
                  <span className="text-muted">
                    {e.entity === "payment"
                      ? "(плащане)"
                      : e.entity === "deposit"
                        ? "(депозит)"
                        : e.entity === "client"
                          ? "(клиент)"
                          : ""}
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
