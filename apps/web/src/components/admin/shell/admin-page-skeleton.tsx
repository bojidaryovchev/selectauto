const ROWS = Array.from({ length: 6 }, (_, i) => i);

/**
 * Placeholder for a page's content — a title, a line of text and a list — shown
 * the moment a section link is tapped (app/admin/loading.tsx) and while the
 * back-office gate runs on a first load (app/admin/layout.tsx).
 */
export function AdminPageSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Зареждане…</span>
      <div className="h-8 w-56 max-w-full animate-pulse rounded-lg bg-neutral-200 motion-reduce:animate-none" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-sm bg-neutral-200 motion-reduce:animate-none" />
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
        {ROWS.map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-lg bg-neutral-100 motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
