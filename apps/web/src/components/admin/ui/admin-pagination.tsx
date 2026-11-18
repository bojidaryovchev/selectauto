import Link from "next/link";
import { buttonClasses } from "@/components/common/button-variants";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

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

const STEP = buttonClasses({ variant: "sec", size: "md" });

/**
 * Pager for a server-paged list (`.bo-pager`): „Назад", the page numbers (just „X / Y" on a phone), „Напред", the
 * arrows as icons. Plain links built by `hrefFor`, so a page can be opened in a new tab; they don't prefetch — each
 * would render a whole page of results in the background.
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
    <nav aria-label="Страници" className="bo-pager">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} prefetch={false} className={STEP} rel="prev">
          <ChevronLeftIcon />
          Назад
        </Link>
      ) : (
        <span className={`${STEP} is-dis`} aria-disabled="true">
          <ChevronLeftIcon />
          Назад
        </span>
      )}
      {/* „1 / 2“ keeps both buttons on one line at 320 px; a screen reader still hears „Страница“. */}
      <span className="bo-pager__n">
        <span className="sr-only">Страница </span>
        {page} / {pageCount}
      </span>
      <ul>
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true">
              <span>…</span>
            </li>
          ) : (
            <li key={p}>
              <Link href={hrefFor(p)} prefetch={false} aria-current={p === page ? "page" : undefined}>
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} prefetch={false} className={STEP} rel="next">
          Напред
          <ChevronRightIcon />
        </Link>
      ) : (
        <span className={`${STEP} is-dis`} aria-disabled="true">
          Напред
          <ChevronRightIcon />
        </span>
      )}
    </nav>
  );
}
