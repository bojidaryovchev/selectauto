/**
 * What a list shows when it has nothing to show — and, if useful, what to do about it (`.ad-empty`; boards
 * `ad-inquiries-list` 3, `ad-mail-states`). `icon` goes in the kit's circle above the title.
 */
export function AdminEmptyState({
  title,
  icon,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="ad-empty">
      {icon ? (
        <span className="sa-empty__ic" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <h2>{title}</h2>
      {children ? <div className="max-w-[52ch] text-[14.5px] text-tx2">{children}</div> : null}
    </div>
  );
}
