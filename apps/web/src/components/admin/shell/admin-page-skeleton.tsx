const ROWS = Array.from({ length: 6 }, (_, i) => i);

/**
 * Placeholder for a page's content (boards `ad-loading`, `ad-loading-first`) — a title, a line of text and a list —
 * shown the moment a section link is tapped (app/admin/loading.tsx) and while the back-office gate runs on a first load
 * (app/admin/layout.tsx).
 */
export function AdminPageSkeleton() {
  return (
    <div role="status" className="bo-sk">
      <span className="sr-only">Зареждане…</span>
      <div className="sa-sk h-8 w-56 max-w-full" />
      <div className="sa-sk h-4 w-full max-w-md" />
      <div className="bo-sk__list">
        {ROWS.map((row) => (
          <div key={row} className="sa-sk bo-skl" />
        ))}
      </div>
    </div>
  );
}
