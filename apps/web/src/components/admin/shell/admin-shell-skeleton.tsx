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
        className="ad-side fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 border-r border-hair bg-s1 lg:flex"
      >
        <div className="ad-side__brand">
          <AdminBrand />
        </div>
        <div className="ad-side__nav">
          <div className="ad-skrows">
            {ROWS.map((row) => (
              <div key={row} className="sa-sk ad-skr" />
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="sa-tbar ad-tbar">
        <div className="ad-tbar__l">
          <span className="ad-tbar__sp" />
          <AdminBrand compact />
        </div>
      </div>
    </>
  );
}
