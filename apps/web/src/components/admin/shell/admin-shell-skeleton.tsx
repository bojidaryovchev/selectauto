import { AdminBrand } from "./admin-brand";

const ROWS = Array.from({ length: 8 }, (_, i) => i);

/**
 * Stand-in for AdminChrome while the session is read: the same sidebar frame
 * and top bar, with placeholder rows instead of links. It is part of the
 * prerendered static shell, so the page has its frame from the first paint and
 * nothing moves when the real chrome streams in.
 */
export function AdminShellSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-linear-to-b from-[#121318] to-[#0b0c10] lg:flex"
      >
        <div className="flex h-16 shrink-0 items-center border-b border-white/8 px-5">
          <AdminBrand tone="dark" />
        </div>
        <div className="flex flex-col gap-1 px-3 py-4">
          {ROWS.map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-xl bg-white/5 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-white/95 px-2 lg:hidden"
      >
        <div className="size-11" />
        <AdminBrand tone="light" />
      </div>
    </>
  );
}
