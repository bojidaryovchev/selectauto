"use client";

import { ADMIN_INPUT, AdminBanner } from "@/components/admin/ui";
import { Button, ConfirmDialog } from "@/components/common";
import { AlertIcon, SearchIcon, SendIcon } from "@/components/icons";
import { VIN_REPORT_PROVIDER_LABEL } from "@/constants/vin-reports";
import { formatUsd } from "@/lib/money";
import { FREE_TEST_VIN, normalizeVin, REPORT_PROVIDERS, type ReportProvider } from "@/lib/vin-report-parse";
import { checkVinForReports, orderVinReport, type VinDeskCheck } from "@/mutations/vin-reports";
import type { ActionResult } from "@/types/action-result.type";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { SendReportDialog } from "../send-report-dialog";
import { VinReportFiles } from "../vin-report-files";
import { ProviderBox } from "./provider-box";

const reportsWord = (n: number) => (n === 1 ? "отчет" : "отчета");

/**
 * Проверете → купете (/admin/carfax-otcheti): the VIN desk.
 *
 * The FREE check comes first and is the point of the screen: it shows how many records Carfax and AutoCheck have for
 * the VIN and which reports were already bought for it, so nobody pays for a report that can't be generated or that
 * the business already has. Only then can a report be bought, through a confirmation that names the VIN, the vehicle
 * and the balance it is paid from. The purchase takes up to a minute (the PDF); the desk says so while it runs, and
 * says truthfully what happened after: the files, a refusal (nothing paid), or no answer (don't buy again yet).
 *
 * A VIN in the address (`?vin=`, the Carfax lead's link) arrives already checked, from the page's render.
 *
 * One primary per view: „Проверете" until a VIN is checked, then Carfax's „Купете отчет".
 */
export function VinReportDesk({
  initialVin,
  initialCheck,
  lead,
  balance,
}: {
  initialVin: string;
  initialCheck: ActionResult<VinDeskCheck> | null;
  /**
   * The Carfax lead the purchase is for (`?zayavka=`), which the report is linked to. With an address that can take
   * mail (`email`), a report bought for the lead's VIN can be e-mailed to the client right away.
   */
  lead: { id: number; name: string; email: string | null; vin: string } | null;
  balance: { availableUsd: number; reports: number } | null;
}) {
  const router = useRouter();
  const uid = useId();
  const [query, setQuery] = useState(initialVin);
  const [check, setCheck] = useState<VinDeskCheck | null>(initialCheck?.success ? initialCheck.data : null);
  const [error, setError] = useState<string | null>(initialCheck && !initialCheck.success ? initialCheck.error : null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [bought, setBought] = useState<{
    label: string;
    vin: string;
    htmlUrl: string;
    pdfUrl: string | null;
    balanceText: string | null;
    /** The report's row, for „Изпратете на клиента"; null when it couldn't be read back. */
    reportId: number | null;
  } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sentText, setSentText] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ReportProvider | null>(null);
  const [buying, setBuying] = useState<ReportProvider | null>(null);
  const [checking, startCheck] = useTransition();
  const [ordering, startOrder] = useTransition();
  const busy = checking || ordering;

  function runCheck() {
    const vin = normalizeVin(query);
    setError(null);
    setBought(null);
    if (!vin) {
      setInputError("Въведете валиден 17-значен VIN номер (без I, O, Q).");
      return;
    }
    setInputError(null);
    startCheck(async () => {
      try {
        const res = await checkVinForReports(vin);
        if (!res.success) {
          setError(res.error);
          setCheck(null);
          return;
        }
        setCheck(res.data);
      } catch {
        // A dropped connection rejects the call; inside a transition that would reach the page's error boundary.
        setError("Връзката със сървъра прекъсна. Опитайте отново.");
      }
    });
  }

  function confirmBuy() {
    const provider = confirming;
    setConfirming(null);
    if (!provider || !check) return;
    const vin = check.vin;
    const label = VIN_REPORT_PROVIDER_LABEL[provider];
    setError(null);
    setBought(null);
    setSentText(null);
    setBuying(provider);
    startOrder(async () => {
      try {
        const res = await orderVinReport({ vin, provider, carfaxRequestId: lead?.id ?? null });
        if (!res.success) {
          setError(res.error);
          router.refresh();
          return;
        }
        const d = res.data;
        setBought({
          label,
          vin,
          htmlUrl: d.htmlUrl,
          pdfUrl: d.pdfUrl,
          balanceText:
            d.balanceAfterUsd === null
              ? null
              : `${formatUsd(d.balanceAfterUsd)}${
                  d.balanceAfterReports === null
                    ? ""
                    : `, стига за ${d.balanceAfterReports} ${reportsWord(d.balanceAfterReports)}`
                }`,
          reportId: d.report?.id ?? null,
        });
        const report = d.report;
        if (report) {
          setCheck((c) =>
            c && c.vin === vin ? { ...c, reports: [report, ...c.reports.filter((r) => r.id !== report.id)] } : c,
          );
        }
        router.refresh();
      } catch {
        setError(
          "Връзката прекъсна, докато отчетът се купуваше. Опреснете страницата: ако е купен, ще се появи в списъка. Не купувайте отново преди това.",
        );
      } finally {
        setBuying(null);
      }
    });
  }

  const testVin = check?.vin === FREE_TEST_VIN;
  const noBalance = balance !== null && balance.reports <= 0;
  const confirmLabel = confirming ? VIN_REPORT_PROVIDER_LABEL[confirming] : "";
  const earlier =
    confirming && check ? check.reports.filter((r) => r.provider === confirming && r.status === "ready") : [];
  const hintId = `${uid}-hint`;
  const errId = `${uid}-err`;
  // „Изпратете на клиента" only for a report of the lead's own VIN, with its PDF, to an address that takes mail.
  const leadEmail = lead?.email ?? null;
  const canSend =
    lead !== null &&
    leadEmail !== null &&
    bought !== null &&
    bought.reportId !== null &&
    bought.pdfUrl !== null &&
    normalizeVin(lead.vin) === bought.vin;

  const feedback =
    error || bought ? (
      <div className="ab-stack gap-2">
        {error ? (
          <AdminBanner tone="error" className="ab-al">
            {error}
          </AdminBanner>
        ) : null}
        {bought ? (
          <AdminBanner tone="success" className="ab-al">
            <b>Отчетът {bought.label} е готов.</b>
            <VinReportFiles
              report={{ pdfUrl: bought.pdfUrl, htmlUrl: bought.htmlUrl, providerLabel: bought.label, vin: bought.vin }}
            />
            {bought.balanceText ? <p>Остатък в AuctionsAPI: {bought.balanceText}.</p> : null}
            {sentText ? (
              <p>
                Изпратен на клиента ({leadEmail}) на {sentText}. Писмото е в Поща.
              </p>
            ) : canSend ? (
              <Button variant="sec" size="md" className="mt-2" onClick={() => setSendOpen(true)}>
                <SendIcon />
                Изпратете на клиента
              </Button>
            ) : null}
          </AdminBanner>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="ab-stack">
      <form
        role="search"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          runCheck();
        }}
        className="sa-pnl ab-srch"
      >
        <label htmlFor={`${uid}-vin`} className="sa-lbl">
          VIN номер
        </label>
        <div className="ab-srch__r">
          <span className="sa-inw">
            <SearchIcon />
            <input
              id={`${uid}-vin`}
              type="search"
              enterKeyHint="search"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="17 знака"
              aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? errId : hintId}
              className={`${ADMIN_INPUT} bo-mono ${inputError ? "is-err" : ""}`}
            />
          </span>
          <Button
            type="submit"
            variant={check ? "sec" : "pri"}
            size="md"
            disabled={busy || !query.trim()}
            busy={checking}
          >
            {checking ? "Проверяване…" : "Проверете"}
          </Button>
        </div>
        {inputError ? (
          <p id={errId} className="ab-req">
            <AlertIcon />
            {inputError}
          </p>
        ) : (
          <p id={hintId} className="ab-hint">
            Проверката е безплатна: показва колко записа имат Carfax и AutoCheck за този VIN и кои отчети вече са
            купени.
          </p>
        )}
        {lead ? (
          <p className="ab-hint">
            За Carfax запитване №{lead.id} от {lead.name}: купеният отчет ще бъде свързан с него.
          </p>
        ) : null}
      </form>

      {!check ? feedback : null}

      {check ? (
        <section className="sa-pnl ab-pub" aria-labelledby={`${uid}-car`}>
          <header className="ab-pub__h">
            <h2 id={`${uid}-car`}>
              <span className="wrap-anywhere">{check.vehicle ?? "Автомобил без име в AuctionsAPI"}</span>
            </h2>
            <p>
              <span className="ab-mono">{check.vin}</span>
              {check.car ? (
                <>
                  {" · "}
                  <a href={`/avtomobil/${check.car.id}`} target="_blank" rel="noreferrer" className="ab-link">
                    {check.car.title}
                  </a>
                </>
              ) : null}
            </p>
          </header>

          {testVin ? (
            <AdminBanner tone="info" className="ab-al">
              Това е тестовият VIN от документацията на AuctionsAPI: отчетите за него са безплатни.
            </AdminBanner>
          ) : null}

          <div className="ab-pg">
            {REPORT_PROVIDERS.map((p) => (
              <ProviderBox
                key={p}
                label={VIN_REPORT_PROVIDER_LABEL[p]}
                records={check[p]}
                reports={check.reports.filter((r) => r.provider === p)}
                primary={p === "carfax"}
                disabled={busy || (noBalance && !testVin)}
                buying={buying === p}
                onBuy={() => setConfirming(p)}
              />
            ))}
          </div>

          {buying ? (
            <p className="bo-sending" role="status">
              <span className="sa-spin bo-spin-sm" aria-hidden="true" />
              Генерира се отчетът {VIN_REPORT_PROVIDER_LABEL[buying]}. Обикновено отнема до минута — не затваряйте
              страницата.
            </p>
          ) : null}

          {feedback}
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={confirming !== null && check !== null}
        title={`Купуване на отчет ${confirmLabel}`}
        confirmLabel="Купете отчета"
        isPending={ordering}
        onConfirm={confirmBuy}
        onCancel={() => setConfirming(null)}
        message={
          check ? (
            <span className="ab-dlg-note text-tx">
              Ще бъде купен отчет <b>{confirmLabel}</b> за VIN <span className="ab-mono">{check.vin}</span>
              {check.vehicle ? ` (${check.vehicle})` : ""}.{" "}
              {testVin ? (
                "Тестовият VIN е безплатен."
              ) : (
                <>
                  Плаща се от баланса в AuctionsAPI
                  {balance ? (
                    <>
                      {" "}
                      — сега <b>{formatUsd(balance.availableUsd)}</b>, стига за {balance.reports}{" "}
                      {reportsWord(balance.reports)}
                    </>
                  ) : null}
                  .
                </>
              )}{" "}
              Генерирането с PDF отнема до минута.
              {earlier.length > 0 ? (
                <strong>
                  {" "}
                  За този VIN вече има отчет {confirmLabel} от {earlier[0].createdAtText} — новият се плаща отново.
                </strong>
              ) : null}
            </span>
          ) : null
        }
      />

      {sendOpen && canSend && bought && lead && leadEmail && bought.reportId !== null ? (
        <SendReportDialog
          open
          onOpenChange={setSendOpen}
          report={{ id: bought.reportId, providerLabel: bought.label, vin: bought.vin }}
          lead={{ id: lead.id, name: lead.name, email: leadEmail }}
          vehicle={check?.vehicle ?? null}
          sentBefore={null}
          onSent={(result) => {
            setSendOpen(false);
            setSentText(result.sentAtText);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
