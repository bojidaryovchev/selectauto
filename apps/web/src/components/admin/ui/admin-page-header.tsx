import Link from "next/link";

/**
 * The top of every admin page: the title, an optional line of context, and the
 * page's actions („+ Нов договор") at the right — wrapping under the title on a
 * phone instead of squeezing it. `back` is for pages a level down (a contract,
 * a thread), where the sidebar alone doesn't say how you got there.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-1 inline-flex min-h-8 items-center text-sm font-semibold text-muted transition-colors hover:text-brand"
          >
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-black tracking-tight wrap-anywhere text-ink">{title}</h1>
        {description && <div className="mt-1 max-w-3xl text-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
