import type { ReactNode } from "react";

/**
 * The account pages' frame (boards `ac-signin`, `ac-register`, `ac-forgot`, `ac-reset`, `ac-verify`, `ac-autherr`;
 * parity check docs/design/parity/auth.md): `AuthMain` is the page's main region under the fixed header, `AuthCard`
 * the 472 px card on it, a title in the display face and an optional subtitle. `centered` is the sign-in error page's
 * card, with its icon above the title. The page's own CSS is styles/account.css.
 */
export function AuthMain({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 pt-(--header-h)">
      <div className="ac-auth">
        <div className="sa-wrap">{children}</div>
      </div>
    </main>
  );
}

export function AuthCard({
  title,
  subtitle,
  centered = false,
  icon,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  centered?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`ac-card ${centered ? "ac-card--c" : ""}`} aria-labelledby="ac-title">
      {icon}
      <div className="ac-card__hd">
        <h1 className="ac-card__t" id="ac-title">
          {title}
        </h1>
        {subtitle ? <p className="ac-card__s">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
