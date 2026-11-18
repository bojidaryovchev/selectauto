import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { MakePlate } from "@/components/common";

/** A breadcrumb step: a link, or the current page when it has no `href`. */
export type HubCrumb = { name: string; href?: string };

/**
 * The header of a make or model hub (boards `hm-make*`, `hm-model*`; `.hm-hub`): the breadcrumb, the make's plate
 * beside the H1 (decision 8: the logo, or two letters without one), the lead, the count and, on a make hub, the model
 * chips (`children`).
 *
 * The count is an `h2` on the model hub, over the cards' `h3` titles as on the catalog, and a `p` on the make hub,
 * whose „Модели …" heading is its `h2` — as today.
 */
export function HubHeader({
  crumbs,
  make,
  title,
  intro,
  count,
  countAs: Count = "p",
  children,
}: {
  crumbs: HubCrumb[];
  make: { name: string; logo: string | null };
  title: string;
  intro: string;
  count: number;
  countAs?: "p" | "h2";
  children?: ReactNode;
}) {
  return (
    <section className="hm-hub">
      <div className="sa-wrap hm-hub__in">
        <nav className="sa-crumbs" aria-label="Пътечка">
          {crumbs.map((crumb, i) => (
            <Fragment key={`${i}:${crumb.name}`}>
              {i > 0 ? <i aria-hidden="true">/</i> : null}
              {crumb.href ? (
                <Link href={crumb.href}>{crumb.name}</Link>
              ) : (
                <span aria-current="page">{crumb.name}</span>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="hm-hub__title">
          <MakePlate name={make.name} logo={make.logo} size="xl" />
          <h1 className="sa-h1 type-h1">{title}</h1>
        </div>

        <p className="sa-lead hm-hub__intro">{intro}</p>

        <Count className="hm-count">
          Намерени автомобили: <strong>{count.toLocaleString("bg-BG")}</strong>
        </Count>

        {children}
      </div>
    </section>
  );
}
