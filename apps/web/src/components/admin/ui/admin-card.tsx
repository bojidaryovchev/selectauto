/** The white panel admin content sits in. Less padding on a phone, where width is scarce. */
export function AdminCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5 ${className ?? ""}`} {...props}>
      {children}
    </section>
  );
}
