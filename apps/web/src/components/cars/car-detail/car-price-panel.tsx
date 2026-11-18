import type { CarDetailPrice, CarLiveBid } from "@/types/car-detail.type";

/** "обновена 25.03.2026" from an ISO/`YYYY-MM-DD HH:MM:SS` timestamp, else "". */
function formatUpdated(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return `обновена ${d.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

/**
 * The price block (boards `cd-*`, `.cd-price`): the primary price big, the live current bid with its freshness
 * (active US auction lots), the appraisal context (ACV / repair estimate / wholesale / pre-accident) as rows, and the
 * market average for the model and year. For a salvage buyer the gap between the sale price and the pre-loss value IS
 * the deal, so all of it shows when raw_json has it. Renders nothing when there's no price at all (an auction with no
 * bid yet and no average).
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
    <section className="sa-pnl cd-price">
      {primary ? (
        <div className="cd-pmain">
          <span>{primary.label}</span>
          <b className="cd-pval">{primary.value}</b>
        </div>
      ) : null}

      {liveBid ? (
        <div className={`cd-bid ${primary ? "cd-sep" : ""}`}>
          <span>
            Текуща оферта{updated ? <small> · {updated}</small> : null}
          </span>
          <b>{liveBid.value}</b>
        </div>
      ) : null}

      {rest.length > 0 ? (
        <dl className={`cd-prows ${primary || liveBid ? "cd-sep" : ""}`}>
          {rest.map((p) => (
            <div key={p.label}>
              <dt>{p.label}</dt>
              <dd>{p.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {marketAvg ? (
        <div className="cd-avg">
          <div>
            <span>Средна продажна цена</span>
            <b>{marketAvg.value}</b>
          </div>
          <small>за модела/годината · {marketAvg.count.toLocaleString("bg-BG")} продажби от архива</small>
        </div>
      ) : null}
    </section>
  );
}
