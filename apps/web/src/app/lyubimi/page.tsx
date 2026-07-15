import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Container, LinkButton } from "@/components/common";
import { CarGridSkeleton } from "@/components/cars/all-cars";
import { AuctionAlertToggle, FavoritesGrid } from "@/components/cars";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { getAuctionAlertPreference, getFavoriteCars } from "@/queries/favorites";

export const metadata: Metadata = {
  title: "Любими автомобили | SelectAuto",
  // A private, per-user list — never indexed.
  robots: { index: false, follow: false },
};

/**
 * /lyubimi — the signed-in user's saved cars. Static shell (header/footer) renders
 * immediately; the data body streams in a <Suspense> because it reads request-time
 * auth (required under cacheComponents — same pattern as the detail page). The body
 * branches on the Auth.js session: signed-out → a sign-in prompt; signed-in → the
 * saved-cars grid.
 */
export default function FavoritesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Container>
          <div className="py-10 max-md:py-7">
            <h1 className="mb-2 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
              Любими автомобили
            </h1>

            <Suspense fallback={<CarGridSkeleton count={8} />}>
              <FavoritesBody />
            </Suspense>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Reads the session (request-time). Signed-out → sign-in prompt; signed-in →
 * fetch the saved cars and hand them to the client <FavoritesGrid>, which renders
 * the grid (reusing the catalog `AuctionCard` — no infinite scroll, favourites are
 * a bounded set), drops cards as they're un-favourited live, and owns the empty
 * state.
 */
async function FavoritesBody() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <p className="mb-5 text-base text-muted">
          Влезте в профила си, за да виждате и управлявате запазените автомобили.
        </p>
        <LinkButton
          href="/sign-in?redirectTo=/lyubimi"
          rippleTheme="light"
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-8 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Вход / Регистрация
        </LinkButton>
      </div>
    );
  }

  const [cars, alertsEnabled] = await Promise.all([
    getFavoriteCars(),
    getAuctionAlertPreference(),
  ]);

  return (
    <>
      <AuctionAlertToggle initialEnabled={alertsEnabled} />
      <FavoritesGrid cars={cars} />
    </>
  );
}
