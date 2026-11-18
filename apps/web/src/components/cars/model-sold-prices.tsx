import type { ModelYearPrice } from "@/queries/cars";

/** USD amount → BG-grouped price string, e.g. 12436 → "12 436 $". */
function usd(amount: number): string {
  return `${amount.toLocaleString("bg-BG")} $`;
}

/** Whether there are enough sold years to show the table (the page also asks, to lay the FAQ out beside it or alone). */
export function hasSoldPrices(rows: ModelYearPrice[]): boolean {
  return rows.length >= 2;
}

/**
 * "Реални продажни цени по година" — a per-year table of AVERAGE realized sale prices for this make/model, computed
 * from our archive of concluded auctions (`getModelSoldPricesByYear`; board `hm-model`, `.hm-sold`). Real,
 * model-specific, aggregate content that both informs the buyer (an honest depreciation curve from actual sales) and
 * gives the SEO hub unique substance. Renders nothing when there aren't enough sold rows.
 */
export function ModelSoldPrices({ label, rows }: { label: string; rows: ModelYearPrice[] }) {
  if (!hasSoldPrices(rows)) return null;

  return (
    <section className="hm-sold" aria-labelledby="hm-sold-t">
      <h2 className="type-h2" id="hm-sold-t">
        Реални продажни цени по година
      </h2>
      <p className="sa-p">
        Средни аукционни цени на продадени {label}, по година на производство — от нашия архив на приключили търгове
        (Copart, IAAI, Encar). Ориентир за пазарната стойност преди транспорт, мито и такси.
      </p>
      <div className="sa-tbl-wrap">
        <table className="sa-tbl">
          <thead>
            <tr>
              <th scope="col">Година</th>
              <th scope="col" className="num">
                Средна продажна цена
              </th>
              <th scope="col" className="num">
                Продажби
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td className="num">
                  <b>{usd(r.avg)}</b>
                </td>
                <td className="num mute">{r.count.toLocaleString("bg-BG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
