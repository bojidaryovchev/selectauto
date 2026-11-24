import { ADMIN_INPUT, AdminBanner, AdminPageHeader, AdminPagination, adminButtonClass } from "@/components/admin/ui";
import { VinReportBalance, VinReportDesk, VinReportList } from "@/components/admin/vin-reports";
import { Button } from "@/components/common";
import { SearchIcon } from "@/components/icons";
import { VIN_REPORTS_PATH } from "@/constants/vin-reports";
import { requirePageWith } from "@/lib/admin";
import { fetchReportBalance } from "@/lib/vin-report-api";
import { syncVinReportHistory } from "@/lib/vin-report-history";
import { normalizeVin } from "@/lib/vin-report-parse";
import { checkVinForReports } from "@/mutations/vin-reports";
import { findCarfaxLeadBrief, listVinReports } from "@/queries/vin-reports";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Carfax отчети" };

/**
 * Buying a report is a Server Action of this page, and a report with a PDF takes 40–60 s. Next.js runs a page's
 * Server Actions with the page's `maxDuration` („set the maxDuration at the page level to change the default timeout
 * of all Server Actions used on the page"); the purchase call gives up at 100 s (lib/vin-report-api.ts), leaving time
 * to record what happened. Within Vercel's limits on every plan.
 */
export const maxDuration = 120;

type SearchParams = { vin?: string; zayavka?: string; q?: string; page?: string };

/**
 * /admin/carfax-otcheti — Carfax and AutoCheck reports through AuctionsAPI (owner, 24.11.2026).
 *
 * The desk checks a VIN for free and buys a report from AuctionsAPI's balance; the list shows every report the key
 * ever bought — here, and outside the admin with the same key, which is how all 68 reports before this page were
 * bought (64 of them for cars in the catalog, 2 for Carfax leads), imported from its history as the page renders.
 *
 * Gated on `reports.order` (admins only). `?vin=` opens the desk on a VIN, already checked; `?zayavka=` links the
 * purchase to a Carfax lead (the lead drawer's „Проверете и купете"); `?q=` filters the list by VIN.
 */
export default async function AdminVinReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageWith("reports.order");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  // Both free and both best-effort: the reports bought elsewhere, before the list is read; the balance meanwhile.
  const [sync, balanceRead] = await Promise.allSettled([syncVinReportHistory(), fetchReportBalance()]);
  if (sync.status === "rejected") console.error("[vin-reports] history import failed", sync.reason);
  if (balanceRead.status === "rejected") console.error("[vin-reports] balance read failed", balanceRead.reason);
  const balance = balanceRead.status === "fulfilled" ? balanceRead.value : null;

  const lead = await findCarfaxLeadBrief(Number(sp.zayavka));
  const checkVin = normalizeVin(sp.vin) ?? normalizeVin(lead?.vin);
  // A lead's VIN that isn't one (typed by the visitor) still goes in the field, for staff to correct.
  const prefill = checkVin ?? lead?.vin ?? "";
  const [{ rows, total, pageCount }, initialCheck] = await Promise.all([
    listVinReports({ q, page }),
    checkVin ? checkVinForReports(checkVin) : Promise.resolve(null),
  ]);

  const keep = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (sp.vin) params.set("vin", sp.vin);
    if (lead) params.set("zayavka", String(lead.id));
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `${VIN_REPORTS_PATH}?${qs}` : VIN_REPORTS_PATH;
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <AdminPageHeader
          title="Carfax отчети"
          description="Безплатна проверка на VIN и покупка на отчети Carfax и AutoCheck чрез AuctionsAPI. Отчетът се плаща от баланса в AuctionsAPI и идва като PDF и HTML."
        />
        <VinReportBalance balance={balance} />
        <VinReportDesk
          key={`${prefill}:${lead?.id ?? ""}`}
          initialVin={prefill}
          initialCheck={initialCheck}
          lead={lead ? { id: lead.id, name: lead.name } : null}
          balance={balance ? { availableUsd: balance.availableUsd, reports: balance.reports } : null}
        />
      </div>

      <section className="ab-sec" aria-labelledby="vin-reports-list">
        <h2 id="vin-reports-list" className="ab-h2">
          Отчети <small>({total})</small>
        </h2>
        <p className="ab-sub">
          Всички отчети, купени с ключа в AuctionsAPI — оттук и извън админа. Файловете са при AuctionsAPI и всеки с
          връзката може да ги отвори, затова ги изпращайте само на клиента.
        </p>

        <form role="search" action={VIN_REPORTS_PATH} className="ab-filt">
          {sp.vin ? <input type="hidden" name="vin" value={sp.vin} /> : null}
          {lead ? <input type="hidden" name="zayavka" value={lead.id} /> : null}
          <label htmlFor="vin-reports-q" className="sr-only">
            Търсете отчет по VIN
          </label>
          <span className="sa-inw">
            <SearchIcon />
            <input
              id="vin-reports-q"
              name="q"
              type="search"
              enterKeyHint="search"
              defaultValue={q}
              placeholder="Търсете по VIN"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`${ADMIN_INPUT} bo-mono`}
            />
          </span>
          <div className="ab-filt__b">
            <Button type="submit" variant="sec" size="md">
              Търсете
            </Button>
            {q ? (
              <Link href={keep({})} prefetch={false} className={adminButtonClass("ghost")}>
                Изчистете
              </Link>
            ) : null}
          </div>
        </form>

        {sync.status === "rejected" ? (
          <AdminBanner tone="warning" className="ab-al">
            Историята на отчетите в AuctionsAPI не можа да се прочете. Отчетите, купени извън админа през последните
            минути, може още да ги няма в списъка.
          </AdminBanner>
        ) : null}

        <VinReportList rows={rows} filtered={Boolean(q)} />

        {rows.some((r) => r.verifiedReal === false) ? (
          <p className="ab-hint">
            „Непотвърден оригинал“: AuctionsAPI е върнал за отчета is_verified_real = false, т.е. не го потвърждава като
            оригинален. AuctionsAPI не описва това поле; отчетите отпреди 30.08.2026 нямат стойност за него.
          </p>
        ) : null}

        <AdminPagination page={page} pageCount={pageCount} hrefFor={(p) => keep({ q, page: p > 1 ? String(p) : "" })} />
      </section>
    </div>
  );
}
