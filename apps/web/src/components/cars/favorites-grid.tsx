"use client";

import type { ReactNode } from "react";
import { AuctionCard } from "@/components/cars/all-cars";
import { LinkButton } from "@/components/common";
import { HeartIcon } from "@/components/icons";
import { useFavorites } from "@/contexts/favorites-context";
import type { CarView } from "@/types/car.type";

/**
 * The signed-in /lyubimi page (boards `ac-fav`, `ac-fav-st`, `ac-fav-flow`; parity check
 * docs/design/parity/lyubimi.md): the header, with `toggle` (the alert switch) beside the title and the intro under it,
 * then the saved cars in the kit's grid. The page fetches the cars server-side and hands them here; this component
 * keeps that list in sync with live un-favouriting. When a card's heart is toggled off (writing back to the shared
 * FavoritesContext), the card drops out immediately instead of lingering until the next full navigation/reload.
 *
 * It only starts filtering once the context has seeded (`initialized`): until then it renders the server list
 * verbatim, so cards never flicker away in the window before the favourite set has loaded (the server list IS the
 * source of truth at mount). The empty state lives here too, so removing the last favourite reveals it without a
 * round-trip; the intro shows only while there are cards.
 */
export function FavoritesGrid({ cars, toggle }: { cars: CarView[]; toggle: ReactNode }) {
  const { isFavorite, initialized } = useFavorites();

  // Before seed: trust the server list. After: hide anything un-favourited since.
  const visible = initialized ? cars.filter((car) => car.id === undefined || isFavorite(car.id)) : cars;

  return (
    <>
      <section className="ac-favtop">
        <div className="sa-wrap">
          <div className="ac-favhd">
            <h1 className="type-h1">Любими автомобили</h1>
            {toggle}
            {visible.length > 0 ? (
              <p className="sa-p ac-favhd__i">
                Автомобилите, които сте запазили. Активните можете да внесете — продадените са за справка.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ac-favgrid">
        <div className="sa-wrap">
          {visible.length === 0 ? (
            <div className="sa-pnl ac-gate">
              <div className="sa-empty">
                <span className="sa-empty__ic" aria-hidden="true">
                  <HeartIcon />
                </span>
                <p className="max-w-[46ch] text-[17px] leading-[1.55] font-semibold text-tx">
                  Все още нямате запазени автомобили.
                </p>
                <LinkButton href="/vsichki-avtomobili" variant="pri">
                  Разгледайте автомобили
                </LinkButton>
              </div>
            </div>
          ) : (
            <div className="sa-grid">
              {visible.map((car) => (
                <AuctionCard key={car.id} car={car} confirmRemove />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
