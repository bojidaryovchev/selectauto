import { LinkButton } from "@/components/common";

/**
 * `notFound()` in an admin page — a contract, deposit or thread that doesn't
 * exist or that this user may not see — renders here, inside the admin shell,
 * instead of the public 404 with the public header (boards `ad-404`, `ad-404-states`; parity check
 * docs/design/parity/admin-shell.md). „Към началото“ goes to /admin, which sends anyone but an admin on to the
 * contracts.
 */
export default function AdminNotFound() {
  return (
    <div className="sa-pnl bo-nf">
      <span className="bo-nf__num" aria-hidden="true">
        404
      </span>
      <span className="sa-eyebrow">Грешка 404</span>
      <h1 className="bo-h1">Няма такъв запис</h1>
      <p className="bo-ph__d">Записът не съществува, изтрит е или нямате достъп до него.</p>
      <LinkButton href="/admin" variant="pri" size="md" className="bo-wph">
        Към началото
      </LinkButton>
    </div>
  );
}
