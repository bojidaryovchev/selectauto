import type { CarDetailSpec } from "@/types/car-detail.type";

/**
 * The full specification sheet — a two-column labelled list (label left, value
 * right) of every present spec for the car. Server-rendered. Long values wrap;
 * the layout collapses to a single column on narrow screens. Mirrors the legacy
 * "📋 Основна информация" info table, modernized.
 */
export function CarSpecSheet({ specs }: { specs: CarDetailSpec[] }) {
  if (specs.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <h2 className="mb-4 text-lg font-black uppercase tracking-tight text-ink">Спецификации</h2>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0"
          >
            <dt className="shrink-0 text-[13px] font-semibold uppercase tracking-wide text-muted">
              {spec.label}
            </dt>
            <dd className="text-right text-sm font-bold text-ink">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
