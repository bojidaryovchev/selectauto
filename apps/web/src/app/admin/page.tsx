import { auth } from "@/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { LEAD_STATUS_META, LEAD_STATUSES, LEAD_TYPE_META, LEAD_TYPES } from "@/constants/admin";
import { isAdmin } from "@/lib/admin";
import type { StatusCounts } from "@/queries/admin";
import { getAdminOverview } from "@/queries/admin";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

// Spelled out: the admin layout's `title.template` applies to child segments
// only, not to the page in its own folder.
export const metadata: Metadata = { title: "Табло · Админ · SelectAuto" };

/**
 * /admin dashboard — a summary card per lead type (the count its inbox lists, a
 * highlighted "new" count, the status breakdown), each line linking to the
 * inbox filtered to it. Data is a live grouped-count query (not cached); the
 * layout gates the route to the back office, and this page is admin-only: leads
 * are sales data, so a „Наблюдаващ" lands on the contracts register instead.
 */
export default async function AdminDashboardPage() {
  if (!isAdmin(await auth())) {
    redirect("/admin/dogovori");
  }
  const overview = await getAdminOverview();
  const totalNew = LEAD_TYPES.reduce((sum, t) => sum + overview[t].new, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Табло"
        description={
          totalNew > 0 ? (
            <>
              Имате <span className="font-bold text-ink">{totalNew}</span> нови заявки за обработка.
            </>
          ) : (
            "Няма нови заявки — всичко е обработено."
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {LEAD_TYPES.map((type) => (
          <LeadCard key={type} type={type} counts={overview[type]} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ type, counts }: { type: (typeof LEAD_TYPES)[number]; counts: StatusCounts }) {
  const meta = LEAD_TYPE_META[type];
  // What the inbox's „Всички" lists: it leaves the archive out, and so does this
  // number (it used to count the archive, so card and inbox disagreed).
  const listed = counts.total - counts.archived;
  return (
    <section className="flex flex-col rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-black text-ink">
          <Link href={meta.href} className="hover:text-brand hover:underline">
            {meta.label}
          </Link>
        </h2>
        <span className="text-2xl font-black text-ink">{listed}</span>
      </div>

      {counts.new > 0 && (
        <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200 ring-inset">
          {counts.new} нови
        </p>
      )}

      <ul className="m-0 mt-auto flex list-none flex-col p-0 text-sm">
        {LEAD_STATUSES.map((s) => (
          <li key={s}>
            <Link
              href={`${meta.href}?status=${s}`}
              prefetch={false}
              className="-mx-2 flex min-h-9 items-center justify-between rounded-md px-2 transition-colors hover:bg-neutral-50"
            >
              <span className="text-muted">{LEAD_STATUS_META[s].label}</span>
              <span className="font-semibold text-ink">{counts[s]}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={meta.href}
        className="mt-3 -mb-2 inline-flex min-h-10 items-center text-sm font-bold text-brand hover:underline"
      >
        Виж заявките →
      </Link>
    </section>
  );
}
