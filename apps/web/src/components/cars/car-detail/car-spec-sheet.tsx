import { CopyButton } from "@/components/common";
import type { CarDetailSpec } from "@/types/car-detail.type";

/**
 * The full specification sheet (boards `cd-*`, `.cd-spec`): every present spec as label and value, two columns where
 * there's room; then the copyable identifiers (Лот №, VIN) in their own box, in mono, each with „Копирайте …".
 * Server-rendered. Long values wrap.
 */
export function CarSpecSheet({ specs }: { specs: CarDetailSpec[] }) {
  if (specs.length === 0) return null;
  const plain = specs.filter((s) => !s.copyable);
  const ids = specs.filter((s) => s.copyable);

  return (
    <section className="sa-pnl cd-spec">
      <div className="sa-pnl__h">
        <h2 className="sa-pnl__t">Спецификации</h2>
      </div>
      {plain.length > 0 ? (
        <dl className="sa-kv">
          {plain.map((spec) => (
            <div key={spec.label}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {ids.length > 0 ? (
        <dl className="sa-kv cd-ids">
          {ids.map((spec) => (
            <div key={spec.label}>
              <dt>{spec.label}</dt>
              <dd>
                <span className="sa-mono">{spec.value}</span>
                <CopyButton value={spec.value} label={spec.label} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
