/** The panel admin content sits in: the kit's first surface (`.sa-pnl`). */
export function AdminCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { className?: string }) {
  return (
    <section className={`sa-pnl min-w-0 ${className ?? ""}`} {...props}>
      {children}
    </section>
  );
}
