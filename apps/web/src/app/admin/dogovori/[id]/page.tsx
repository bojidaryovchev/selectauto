import { auth } from "@/auth";
import { ContractAdminTools, ContractDocumentButton, ContractForm } from "@/components/admin/contracts";
import { PaymentStageCard } from "@/components/admin/contracts/payment-stage-card";
import { AdminPageHeader, AdminStatusTag } from "@/components/admin/ui";
import { MakePlate } from "@/components/common";
import { ChevronDownIcon, PencilIcon } from "@/components/icons";
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
import { getMakeLogoLookup } from "@/lib/make-logo-lookup";
import { dbToCents, formatDbAmount } from "@/lib/money";
import { formatSofiaDate, formatSofiaDateTime } from "@/lib/sofia-time";
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
      <dt>{label}: </dt>
      <dd>{mono ? <span className="ab-mono">{children}</span> : children}</dd>
    </div>
  );
}

/**
 * /admin/dogovori/[id] — the contract detail (spec §4; boards `ab-contract` and its states, parity check
 * docs/design/parity/admin-contract.md): head data, client, the market's пера, one card per payment stage with
 * status/recipient/остатък and its notice, payment and attachment actions, the linked deposit, the audit trail, and
 * an inline edit form. The layout gates the route to the back office; getContract 404s a contract the user may not
 * see.
 *
 * Grids follow the width of the content column (container queries), not the
 * window: next to the sidebar, a 1 280 px screen leaves less room than a tablet.
 */
export default async function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, allRecipients, session, logoFor] = await Promise.all([
    getContract(Number(id)),
    listRecipients(),
    auth(),
    getMakeLogoLookup(),
  ]);
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

  // The contract's one main action is the document when the viewer has no stage actions (an observer).
  const docPrimary = !stageActions.issueNotices && !stageActions.recordPayments;

  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/dogovori", label: "Всички договори" }}
        title={`Договор № ${contract.number}`}
        badge={statusMeta ? <AdminStatusTag tone={statusMeta.tone}>{statusMeta.label}</AdminStatusTag> : null}
        description={`${marketMeta?.label ?? contract.market} (${contract.currency}) · Дата: ${formatSofiaDate(contract.contractDate)}`}
        // Printing is open to „Наблюдаващ" too — it never edits the contract.
        actions={
          <ContractDocumentButton
            contractId={contract.id}
            documents={documents.filter((d) => d.kind === "contract")}
            primary={docPrimary}
          />
        }
      />

      <div className="ab-dtop">
        <div className="ab-dgrid">
          <section className="sa-pnl ab-dcard">
            <h2>Клиент</h2>
            <dl className="ab-facts">
              <Fact label="Тип">{CLIENT_KIND_META[client.kind as ClientKind]?.label ?? client.kind}</Fact>
              <Fact label={client.kind === "company" ? "Фирма" : "Име"}>
                <b>{client.name}</b>
              </Fact>
              {client.egn ? <Fact label="ЕГН">{client.egn}</Fact> : null}
              {client.eik ? <Fact label="ЕИК">{client.eik}</Fact> : null}
              {client.vatNumber ? <Fact label="ДДС №">{client.vatNumber}</Fact> : null}
              {client.representative ? <Fact label="Представител">{client.representative}</Fact> : null}
              {client.address ? <Fact label="Адрес">{client.address}</Fact> : null}
              {client.phone ? <Fact label="Телефон">{client.phone}</Fact> : null}
              {client.email ? <Fact label="Имейл">{client.email}</Fact> : null}
            </dl>
          </section>

          <section className="sa-pnl ab-dcard">
            <h2>Автомобил</h2>
            <dl className="ab-facts">
              <div>
                <dd className="ab-car flex">
                  {contract.carMake ? (
                    <MakePlate name={contract.carMake} logo={logoFor(contract.carMake)} size="sm" />
                  ) : null}
                  <span>
                    <b>
                      {contract.carYear} {contract.carMake} {contract.carModel}
                    </b>
                  </span>
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
          </section>

          {/* Two columns: the пера need the room — full width under the other two. */}
          <section className="sa-pnl ab-dcard ab-pts">
            <h2>Финансови точки</h2>
            <dl className="ab-ptl">
              {points.map((p) => (
                <div key={p.label}>
                  <dt>{p.label}</dt>
                  <dd>
                    {formatDbAmount(p.value)} {contract.currency}
                    {p.foreignCurrency && contract.amountCarForeign ? (
                      <small>
                        ({formatDbAmount(contract.amountCarForeign)} {contract.foreignCurrency} × курс{" "}
                        {contract.foreignRate})
                      </small>
                    ) : null}
                  </dd>
                </div>
              ))}
              {dbToCents(contract.depositDeduction) > 0 && deposit ? (
                <div className="is-dep">
                  <dt>Депозит № {deposit.number}</dt>
                  <dd>
                    −{formatDbAmount(contract.depositDeduction)} {contract.currency}
                  </dd>
                </div>
              ) : null}
              <div className="is-tot">
                <dt>Обща сума</dt>
                <dd>
                  {formatDbAmount(contract.totalAmount)} {contract.currency}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* ── Плащания ── one column on a phone, two once there's room, four on a wide
          screen; `items-start` so a card with an open panel doesn't stretch its neighbour. */}
      <section className="ab-sec ab-stgs">
        <h2 className="ab-h2">Плащания</h2>
        <div className="ab-stgg">
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
        <details className="ab-disc">
          <summary>
            <span>
              <PencilIcon />
              Редакция на договора
            </span>
            <ChevronDownIcon />
          </summary>
          <div className="ab-disc__b">
            <p className="ab-sub">
              Промените обновяват дължимите суми на неплатените етапи. Вече генерирани документи{" "}
              <b className="text-tx">НЕ</b> се променят — при нужда се генерира нова версия. Клиентът и приспаднатият
              депозит не се променят след създаване.
            </p>
            {/* Keyed on the last change: the form keeps its own copy of the values,
                and a renumber, a status flip from a payment or another save must
                not be written back over by its stale copy (2026-114 lost its new
                основание to a save 7 s after the renumber). */}
            <ContractForm key={contract.updatedAt.getTime()} contract={contract} />
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
      <section className="ab-sec">
        <h2 className="ab-h2">История</h2>
        <div className="ab-hist">
          {events.length === 0 ? (
            <p>Няма записани събития.</p>
          ) : (
            <ul>
              {events.map((e) => (
                <li key={e.id}>
                  <time dateTime={new Date(e.createdAt).toISOString()}>{formatSofiaDateTime(e.createdAt)}</time>
                  <b>{auditActionLabel(e.action)}</b>
                  <span>
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
    </>
  );
}
