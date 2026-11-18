import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { LinkButton } from "@/components/common";
import { CarGridSkeleton } from "@/components/cars/all-cars";
import { AuctionAlertToggle, FavoritesGrid } from "@/components/cars";
import { LogInIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { getAuctionAlertPreference, getFavoriteCars } from "@/queries/favorites";

export const metadata: Metadata = {
  title: "Любими автомобили | SelectAuto",
  // A private, per-user list — never indexed.
  robots: { index: false, follow: false },
};

/**
 * /lyubimi — the signed-in user's saved cars (boards `ac-fav`, `ac-fav-out`, `ac-fav-st`; parity check
 * docs/design/parity/lyubimi.md). Static shell (header/footer, and the title with card skeletons) renders
 * immediately; the data body streams in a <Suspense> because it reads request-time auth (required under
 * cacheComponents — same pattern as the detail page). The body branches on the Auth.js session: signed-out → a
 * sign-in prompt; signed-in → the alert switch and the saved-cars grid.
 */
export default function FavoritesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-(--header-h)">
        <Suspense fallback={<FavoritesLoading />}>
          <FavoritesBody />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

/** While the session and the list load (`ac-fav-st` 6): the title and the catalog's card skeletons. */
function FavoritesLoading() {
  return (
    <>
      <section className="ac-favtop">
        <div className="sa-wrap">
          <div className="ac-favhd">
            <h1 className="type-h1">Любими автомобили</h1>
          </div>
        </div>
      </section>
      <section className="ac-favgrid">
        <div className="sa-wrap">
          <CarGridSkeleton count={8} />
        </div>
      </section>
    </>
  );
}

/**
 * Reads the session (request-time). Signed-out → sign-in prompt; signed-in → fetch the saved cars and the alert
 * preference and hand them to the client <FavoritesGrid>, which renders the header and the grid (reusing the
 * catalog's card — no infinite scroll, favourites are a bounded set), drops cards as they're un-favourited live, and
 * owns the empty state.
 */
async function FavoritesBody() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <section className="ac-favout">
        <div className="sa-wrap">
          <h1 className="type-h1">Любими автомобили</h1>
          <div className="sa-pnl ac-gate">
            <div className="sa-empty">
              <span className="sa-empty__ic" aria-hidden="true">
                <LogInIcon />
              </span>
              <p className="max-w-[46ch] text-[17px] leading-[1.55] font-semibold text-tx">
                Влезте в профила си, за да виждате и управлявате запазените автомобили.
              </p>
              <LinkButton href="/sign-in?redirectTo=/lyubimi" variant="pri">
                Вход / Регистрация
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const [cars, alertsEnabled] = await Promise.all([getFavoriteCars(), getAuctionAlertPreference()]);

  return <FavoritesGrid cars={cars} toggle={<AuctionAlertToggle initialEnabled={alertsEnabled} />} />;
}
