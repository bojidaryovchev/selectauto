/** What a list shows when it has nothing to show — and, if useful, what to do about it (`.ad-empty`). */
export function AdminEmptyState({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="ad-empty">
      <h2>{title}</h2>
      {children ? <div className="max-w-[52ch] text-[14.5px] text-tx2">{children}</div> : null}
    </div>
  );
}
