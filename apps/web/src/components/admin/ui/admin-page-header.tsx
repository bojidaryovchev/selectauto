import { LinkButton } from "@/components/common";
import { ArrowLeftIcon } from "@/components/icons";

/**
 * The top of every admin page (board `ad-dashboard` and every admin page; `.bo-ph`): the title in the display face, an
 * optional line of context, and the page's actions („Нов договор") at the right — wrapping under the title on a phone
 * instead of squeezing it. `back` is for pages a level down (a contract, a thread), where the sidebar alone doesn't
 * say how you got there; `badge` sits beside the title (a record's status).
 */
export function AdminPageHeader({
  title,
  badge,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="bo-ph">
      <div className="bo-ph__l">
        {back ? (
          <LinkButton href={back.href} variant="txt" size="sm" className="bo-back">
            <ArrowLeftIcon />
            {back.label}
          </LinkButton>
        ) : null}
        <div className="bo-ph__row">
          <h1 className="bo-h1">{title}</h1>
          {badge}
        </div>
        {description ? <div className="bo-ph__d">{description}</div> : null}
      </div>
      {actions ? <div className="bo-ph__act">{actions}</div> : null}
    </header>
  );
}
