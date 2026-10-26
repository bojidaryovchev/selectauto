/** What a list shows when it has nothing to show — and, if useful, what to do about it. */
export function AdminEmptyState({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
