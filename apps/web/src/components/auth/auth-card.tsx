import type { ReactNode } from "react";

/** Centered card shell for the auth pages (sign-in/up, forgot/reset, verify). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-110 rounded-[22px] border border-line bg-white p-8 shadow-card max-md:p-6">
      <h1 className="mb-1.5 text-2xl font-black uppercase tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mb-6 text-sm text-muted">{subtitle}</p> : <div className="mb-6" />}
      {children}
    </div>
  );
}
