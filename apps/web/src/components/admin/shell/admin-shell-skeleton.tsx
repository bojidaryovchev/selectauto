import { AdminBrand } from "./admin-brand";

const ROWS = Array.from({ length: 8 }, (_, i) => i);

/**
 * Stand-in for AdminChrome while the session is read (board `ad-shell-phone` 4, „Първо зареждане"): the same sidebar
 * frame and top bar, with placeholder rows instead of links. It is part of the prerendered static shell, so the page
 * has its frame from the first paint and nothing moves when the real chrome streams in.
 */
export function AdminShellSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="bo-side fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 border-r border-hair bg-s1 lg:flex"
      >
        <div className="bo-side__brand">
          <AdminBrand />
        </div>
        <div className="bo-side__nav">
          <div className="bo-skrows">
            {ROWS.map((row) => (
              <div key={row} className="sa-sk bo-skr" />
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="sa-tbar bo-tbar">
        <div className="bo-tbar__l">
          <span className="bo-tbar__sp" />
          <AdminBrand compact />
        </div>
      </div>
    </>
  );
}
