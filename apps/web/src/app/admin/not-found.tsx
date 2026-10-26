import Link from "next/link";

/**
 * `notFound()` in an admin page — a contract, deposit or thread that doesn't
 * exist or that this user may not see — renders here, inside the admin shell,
 * instead of the public 404 with the public header. „Към началото“ goes to
 * /admin, which sends anyone but an admin on to the contracts.
 */
export default function AdminNotFound() {
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <p className="text-[13px] font-black tracking-wider text-brand-dark uppercase">Грешка 404</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">Няма такъв запис</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Записът не съществува, изтрит е или нямате достъп до него.</p>
      <Link
        href="/admin"
        className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition-colors hover:bg-neutral-50"
      >
        Към началото
      </Link>
    </div>
  );
}
