import type { CarDetailPrice, CarLiveBid } from "@/types/car-detail.type";

/** "обновена 25.03.2026" from an ISO/`YYYY-MM-DD HH:MM:SS` timestamp, else "". */
function formatUpdated(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return `обновена ${d.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

/**
 * The price block: the primary price big and bold, the appraisal context
 * (ACV / repair estimate / wholesale / pre-accident) listed underneath as
 * secondary rows. For a salvage buyer the gap between the sale price and the
 * pre-loss value IS the deal, so we surface all of it when raw_json has it. Active
 * US auction lots also show the live current bid + its freshness. Renders nothing
 * when there's no price at all (auction with no bid yet).
 */
export function CarPricePanel({
  prices,
  liveBid,
  marketAvg,
}: {
  prices: CarDetailPrice[];
  liveBid?: CarLiveBid;
  marketAvg?: { value: string; count: number };
}) {
  if (prices.length === 0 && !liveBid && !marketAvg) return null;

  const primary = prices.find((p) => p.primary);
  const rest = prices.filter((p) => !p.primary);
  const updated = formatUpdated(liveBid?.updatedAt);

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      {primary ? (
        <div className="mb-3">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-muted">
            {primary.label}
          </span>
          <span className="text-3xl/tight font-black text-brand">{primary.value}</span>
        </div>
      ) : null}

      {liveBid ? (
        <div className={`flex items-baseline justify-between gap-4 ${primary ? "border-t border-line pt-3" : ""} pb-1`}>
          <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Текуща оферта{updated ? <span className="ml-1 normal-case font-normal text-muted/80">· {updated}</span> : null}
          </span>
          <span className="text-lg font-black text-ink">{liveBid.value}</span>
        </div>
      ) : null}

      {rest.length > 0 ? (
        <dl className={primary ? "border-t border-line pt-3" : ""}>
          {rest.map((p) => (
            <div key={p.label} className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-[13px] text-muted">{p.label}</dt>
              <dd className="text-sm font-bold text-ink">{p.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {marketAvg ? (
        <div className="mt-3 rounded-xl bg-[#f7f8fa] px-4 py-3 ring-1 ring-line">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">
              Средна продажна цена
            </span>
            <span className="text-sm font-black text-ink">{marketAvg.value}</span>
          </div>
          <span className="text-[11px] text-muted/80">
            за модела/годината · {marketAvg.count.toLocaleString("bg-BG")} продажби от архива
          </span>
        </div>
      ) : null}
    </section>
  );
}
