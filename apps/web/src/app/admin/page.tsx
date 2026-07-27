import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getAdminOverview } from "@/queries/admin";
import {
  LEAD_STATUSES,
  LEAD_STATUS_META,
  LEAD_TYPES,
  LEAD_TYPE_META,
} from "@/constants/admin";
import type { StatusCounts } from "@/queries/admin";

/**
 * /admin dashboard — a summary card per lead type (total + a highlighted "new"
 * count + the full status breakdown), each linking to its inbox. Data is a live
 * grouped-count query (not cached); the layout gates the route to the back
 * office, and this page is admin-only: leads are sales data, so a „Наблюдаващ"
 * lands on the contracts register instead.
 */
export default async function AdminDashboardPage() {
  if (!isAdmin(await auth())) {
    redirect("/admin/dogovori");
  }
  const overview = await getAdminOverview();
  const totalNew = LEAD_TYPES.reduce((sum, t) => sum + overview[t].new, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">Табло</h1>
        <p className="mt-1 text-sm text-muted">
          {totalNew > 0 ? (
            <>
              Имате <span className="font-bold text-ink">{totalNew}</span> нови заявки за обработка.
            </>
          ) : (
            "Няма нови заявки — всичко е обработено."
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEAD_TYPES.map((type) => (
          <LeadCard key={type} type={type} counts={overview[type]} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({
  type,
  counts,
}: {
  type: (typeof LEAD_TYPES)[number];
  counts: StatusCounts;
}) {
  const meta = LEAD_TYPE_META[type];
  return (
    <Link
      href={meta.href}
      className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-black text-ink">{meta.label}</h2>
        <span className="text-2xl font-black text-ink">{counts.total}</span>
      </div>

      {counts.new > 0 && (
        <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
          {counts.new} нови
        </p>
      )}

      <dl className="mt-auto space-y-1 text-sm">
        {LEAD_STATUSES.map((s) => (
          <div key={s} className="flex items-center justify-between">
            <dt className="text-muted">{LEAD_STATUS_META[s].label}</dt>
            <dd className="font-semibold text-ink">{counts[s]}</dd>
          </div>
        ))}
      </dl>

      <span className="mt-4 text-sm font-bold text-brand group-hover:underline">
        Виж заявките →
      </span>
    </Link>
  );
}
