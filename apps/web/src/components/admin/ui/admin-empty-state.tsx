/**
 * What a list shows when it has nothing to show — and, if useful, what to do about it (`.bo-empty`; boards
 * `ad-inquiries-list` 3, `ad-mail-states`). `icon` goes in the kit's circle above the title. The title is a heading
 * of the page's second level; `titleAs="p"` keeps the look without the heading, for a list under a lower one (the
 * mobile.bg mappings under „Марки").
 */
export function AdminEmptyState({
  title,
  icon,
  titleAs = "h2",
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  titleAs?: "h2" | "p";
  children?: React.ReactNode;
}) {
  return (
    <div className="bo-empty">
      {icon ? (
        <span className="sa-empty__ic" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {titleAs === "p" ? (
        <p className="max-w-none font-sans text-[17px]/[1.4] font-extrabold text-tx">{title}</p>
      ) : (
        <h2>{title}</h2>
      )}
      {children ? <div className="max-w-[52ch] text-[14.5px] text-tx2">{children}</div> : null}
    </div>
  );
}
