import type { CarDetailPrice } from "@/types/car-detail.type";

/**
 * The price block: the primary price big and bold, the appraisal context
 * (ACV / repair estimate / wholesale / pre-accident) listed underneath as
 * secondary rows. For a salvage buyer the gap between the sale price and the
 * pre-loss value IS the deal, so we surface all of it when raw_json has it.
 * Renders nothing when there's no price at all (auction with no bid yet).
 */
export function CarPricePanel({ prices }: { prices: CarDetailPrice[] }) {
  if (prices.length === 0) return null;

  const primary = prices.find((p) => p.primary);
  const rest = prices.filter((p) => !p.primary);

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      {primary ? (
        <div className="mb-3">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-muted">
            {primary.label}
          </span>
          <span className="text-3xl font-black leading-tight text-brand">{primary.value}</span>
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
    </section>
  );
}
