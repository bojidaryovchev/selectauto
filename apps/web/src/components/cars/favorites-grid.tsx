"use client";

import { AuctionCard } from "@/components/cars/all-cars";
import { LinkButton } from "@/components/common";
import { useFavorites } from "@/contexts/favorites-context";
import type { CarView } from "@/types/car.type";

/**
 * Client grid for /lyubimi. The page fetches the user's saved cars server-side and
 * hands them here; this component keeps that list in sync with live un-favouriting.
 * When a card's heart is toggled off (writing back to the shared FavoritesContext),
 * the card drops out immediately instead of lingering until the next full
 * navigation/reload.
 *
 * It only starts filtering once the context has seeded (`initialized`): until then
 * it renders the server list verbatim, so cards never flicker away in the window
 * before the favourite set has loaded (the server list IS the source of truth at
 * mount). The empty state lives here too, so removing the last favourite reveals it
 * without a round-trip.
 */
export function FavoritesGrid({ cars }: { cars: CarView[] }) {
  const { isFavorite, initialized } = useFavorites();

  // Before seed: trust the server list. After: hide anything un-favourited since.
  const visible = initialized
    ? cars.filter((car) => car.id === undefined || isFavorite(car.id))
    : cars;

  if (visible.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <p className="mb-5 text-base text-muted">Все още нямате запазени автомобили.</p>
        <LinkButton
          href="/vsichki-avtomobili"
          rippleTheme="light"
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-linear-to-r from-brand-dark to-brand px-8 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(216,111,22,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Разгледай автомобили
        </LinkButton>
      </div>
    );
  }

  return (
    <>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">
        Автомобилите, които сте запазили. Активните можете да внесете — продадените са за справка.
      </p>
      <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((car) => (
          <AuctionCard key={car.id} car={car} />
        ))}
      </div>
    </>
  );
}
