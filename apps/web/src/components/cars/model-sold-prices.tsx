import type { ModelYearPrice } from "@/queries/cars";

/** USD amount → BG-grouped price string, e.g. 12436 → "12 436 $". */
function usd(amount: number): string {
  return `${amount.toLocaleString("bg-BG")} $`;
}

/**
 * "Реални продажни цени по година" — a per-year table of AVERAGE realized sale
 * prices for this make/model, computed from our archive of concluded auctions
 * (`getModelSoldPricesByYear`). Real, model-specific, aggregate content that both
 * informs the buyer (an honest depreciation curve from actual sales) and gives the
 * SEO hub unique substance. Renders nothing when there aren't enough sold rows.
 */
export function ModelSoldPrices({ label, rows }: { label: string; rows: ModelYearPrice[] }) {
  if (rows.length < 2) return null;

  return (
    <section className="mt-14 max-w-2xl">
      <h2 className="mb-2 text-2xl font-black text-ink">Реални продажни цени по година</h2>
      <p className="mb-5 text-sm text-muted">
        Средни аукционни цени на продадени {label}, по година на производство — от нашия архив на
        приключили търгове (Copart, IAAI, Encar). Ориентир за пазарната стойност преди транспорт,
        мито и такси.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-100 text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-[#f7f8fa] text-[12px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Година</th>
              <th className="px-5 py-3 text-right font-semibold">Средна продажна цена</th>
              <th className="px-5 py-3 text-right font-semibold">Продажби</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-b border-line/60 last:border-b-0">
                <td className="px-5 py-2.5 font-bold text-ink">{r.year}</td>
                <td className="px-5 py-2.5 text-right font-bold text-brand-dark">{usd(r.avg)}</td>
                <td className="px-5 py-2.5 text-right text-muted">{r.count.toLocaleString("bg-BG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
