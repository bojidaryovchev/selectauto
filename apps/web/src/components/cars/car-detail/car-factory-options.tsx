import type { CarFactoryOptions as CarFactoryOptionsData } from "@/types/car-detail.type";

/** A chip list of option names under a small section heading. */
function OptionGroup({ title, names }: { title: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div>
      <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</span>
      <div className="flex flex-wrap gap-2">
        {names.map((n) => (
          <span
            key={n}
            className="inline-flex items-center rounded-lg bg-[#f7f8fa] px-3 py-1.5 text-[13px] font-semibold text-ink ring-1 ring-line"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * ENCAR factory options — the "Фабрични пакети" section. Standard equipment
 * (`details.options.standard[]` decoded via the korea-options dictionary, grouped by
 * section) plus the dealer/priced extras (`options_extra[]`, already English). Present
 * on ~71% of active ENCAR lots. Renders nothing when neither list has content.
 */
export function CarFactoryOptions({ options }: { options: CarFactoryOptionsData }) {
  const { standard, extras } = options;
  const total = standard.reduce((n, g) => n + g.names.length, 0) + extras.length;
  if (total === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card max-md:p-5">
      <h2 className="mb-5 text-lg font-black uppercase tracking-tight text-ink">
        Фабрични пакети
        <span className="ml-2 text-sm font-bold text-muted">({total})</span>
      </h2>

      <div className="flex flex-col gap-5">
        {standard.map((g) => (
          <OptionGroup key={g.section} title={g.section} names={g.names} />
        ))}
        {extras.length > 0 ? (
          <OptionGroup title="Допълнителни пакети" names={extras.map((e) => e.name)} />
        ) : null}
      </div>
    </section>
  );
}
