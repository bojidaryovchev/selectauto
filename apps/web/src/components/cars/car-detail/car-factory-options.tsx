import type { CarFactoryOptions as CarFactoryOptionsData } from "@/types/car-detail.type";

/** A chip list of option names under a small sub-heading. */
function OptionGroup({ title, names }: { title: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <>
      <span className="cd-sub">{title}</span>
      <div className="cd-chips">
        {names.map((n) => (
          <span key={n} className="cd-opt">
            {n}
          </span>
        ))}
      </div>
    </>
  );
}

/**
 * ENCAR factory options — „Фабрични пакети" with the total (boards `cd-korea*`). Standard equipment
 * (`details.options.standard[]` decoded via the korea-options dictionary, grouped by section) plus the dealer/priced
 * extras (`options_extra[]`, already English) under „Допълнителни пакети". Present on ~71% of active ENCAR lots.
 * Renders nothing when neither list has content.
 */
export function CarFactoryOptions({ options }: { options: CarFactoryOptionsData }) {
  const { standard, extras } = options;
  const total = standard.reduce((n, g) => n + g.names.length, 0) + extras.length;
  if (total === 0) return null;

  return (
    <section className="sa-pnl">
      <div className="sa-pnl__h">
        <h2 className="sa-pnl__t">
          Фабрични пакети <small className="text-sm font-bold text-tx3">({total})</small>
        </h2>
      </div>
      <div className="cd-opts">
        {standard.map((g) => (
          <OptionGroup key={g.section} title={g.section} names={g.names} />
        ))}
        {extras.length > 0 ? <OptionGroup title="Допълнителни пакети" names={extras.map((e) => e.name)} /> : null}
      </div>
    </section>
  );
}
