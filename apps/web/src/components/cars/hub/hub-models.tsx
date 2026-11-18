import Link from "next/link";

/**
 * „Модели {марка}" on a make hub (board `hm-make`): a chip per model hub, its listing count beside the name, most
 * listings first — the brand tier's links down to its model hubs. They wrap from 640 px and become a three-row
 * horizontal swipe on a phone, so none is hidden.
 *
 * No route prefetch: a big make renders 100+ chips, and viewport prefetch fired ~155 RSC requests per hub view and
 * measurably delayed LCP on mobile.
 */
export function HubModels({
  label,
  models,
}: {
  label: string;
  models: { href: string; name: string; count: number }[];
}) {
  if (models.length === 0) return null;

  return (
    <section className="hm-models" aria-labelledby="hm-models-t">
      <h2 className="type-h3" id="hm-models-t">
        Модели {label}
      </h2>
      <div className="sa-chips hm-models__list">
        {models.map((m) => (
          <Link key={m.href} href={m.href} prefetch={false} className="sa-chip">
            {m.name}
            <small>{m.count.toLocaleString("bg-BG")}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
