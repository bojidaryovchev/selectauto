import Link from "next/link";

/** The page numbers to show: the first, the last, and a window around the current one; null = a gap. */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev > 1) out.push(null);
    out.push(p);
  }
  return out;
}

const STEP =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-neutral-50";
const NUMBER =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors";

/**
 * Pager for a server-paged list: „Назад", the page numbers (just „X / Y" on a
 * phone), „Напред". Plain links built by `hrefFor`, so a page can be
 * opened in a new tab; they don't prefetch — each would render a whole page of
 * results in the background.
 */
export function AdminPagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Страници" className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} prefetch={false} className={STEP} rel="prev">
          ← Назад
        </Link>
      ) : (
        <span className={`${STEP} pointer-events-none opacity-40`}>← Назад</span>
      )}
      {/* „1 / 2“ keeps both buttons on one line at 320 px; a screen reader still hears „Страница“. */}
      <span className="px-1 text-sm whitespace-nowrap text-muted sm:hidden">
        <span className="sr-only">Страница </span>
        {page} / {pageCount}
      </span>
      <ul className="m-0 hidden list-none items-center gap-1 p-0 sm:flex">
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-sm text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                prefetch={false}
                aria-current={p === page ? "page" : undefined}
                className={`${NUMBER} ${p === page ? "bg-ink text-white" : "text-muted hover:bg-neutral-100 hover:text-ink"}`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} prefetch={false} className={STEP} rel="next">
          Напред →
        </Link>
      ) : (
        <span className={`${STEP} pointer-events-none opacity-40`}>Напред →</span>
      )}
    </nav>
  );
}
