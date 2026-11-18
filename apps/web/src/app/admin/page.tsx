import { auth } from "@/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { LinkButton } from "@/components/common";
import { ArrowRightIcon, CalculatorIcon, FileSearchIcon, MessageIcon } from "@/components/icons";
import { LEAD_STATUS_META, LEAD_STATUSES, LEAD_TYPE_META, LEAD_TYPES, type LeadType } from "@/constants/admin";
import { isAdmin } from "@/lib/admin";
import type { StatusCounts } from "@/queries/admin";
import { getAdminOverview } from "@/queries/admin";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

// Spelled out: the admin layout's `title.template` applies to child segments
// only, not to the page in its own folder.
export const metadata: Metadata = { title: "Табло · Админ · SelectAuto" };

/** Each lead type's tile icon, as in the navigation. */
const LEAD_ICONS: Record<LeadType, (props: { className?: string }) => React.ReactNode> = {
  carfax: FileSearchIcon,
  inquiry: MessageIcon,
  calculator: CalculatorIcon,
};

/**
 * /admin dashboard (boards `ad-dashboard`, `ad-dashboard-states`; parity check docs/design/parity/admin-shell.md) — a
 * card per lead type (the count its inbox lists, the "new" count as a tag, the status breakdown with the kit's dots),
 * each line linking to the inbox filtered to it. Data is a live grouped-count query (not cached); the layout gates the
 * route to the back office, and this page is admin-only: leads are sales data, so a „Наблюдаващ" lands on the
 * contracts register instead.
 */
export default async function AdminDashboardPage() {
  if (!isAdmin(await auth())) {
    redirect("/admin/dogovori");
  }
  const overview = await getAdminOverview();
  const totalNew = LEAD_TYPES.reduce((sum, t) => sum + overview[t].new, 0);

  return (
    <>
      <AdminPageHeader
        title="Табло"
        description={
          totalNew > 0 ? (
            <>
              Имате <b>{totalNew}</b> нови заявки за обработка.
            </>
          ) : (
            "Няма нови заявки — всичко е обработено."
          )
        }
      />

      <div className="ad-dash">
        {LEAD_TYPES.map((type) => (
          <LeadCard key={type} type={type} counts={overview[type]} />
        ))}
      </div>
    </>
  );
}

function LeadCard({ type, counts }: { type: LeadType; counts: StatusCounts }) {
  const meta = LEAD_TYPE_META[type];
  const Icon = LEAD_ICONS[type];
  // What the inbox's „Всички" lists: it leaves the archive out, and so does this
  // number (it used to count the archive, so card and inbox disagreed).
  const listed = counts.total - counts.archived;
  return (
    <section className="sa-pnl ad-lead">
      <div className="ad-lead__h">
        <div className="ad-lead__t">
          <span className="ad-tile" aria-hidden="true">
            <Icon />
          </span>
          <h2>
            <Link href={meta.href}>{meta.label}</Link>
          </h2>
        </div>
        <span className="ad-lead__n">{listed}</span>
      </div>

      {counts.new > 0 ? (
        <p>
          <span className="sa-tag sa-tag--warn">
            <span className="sa-dot sa-dot--warn" aria-hidden="true" />
            {counts.new} нови
          </span>
        </p>
      ) : null}

      <ul className="ad-st">
        {LEAD_STATUSES.map((s) => {
          const tone = LEAD_STATUS_META[s].tone;
          return (
            <li key={s}>
              <Link href={`${meta.href}?status=${s}`} prefetch={false}>
                <span>
                  <span className={`sa-dot ${tone ? `sa-dot--${tone}` : ""}`} aria-hidden="true" />
                  {LEAD_STATUS_META[s].label}
                </span>
                <b>{counts[s]}</b>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="ad-lead__f">
        <LinkButton href={meta.href} variant="txt" size="md">
          Вижте заявките
          <ArrowRightIcon />
        </LinkButton>
      </div>
    </section>
  );
}
