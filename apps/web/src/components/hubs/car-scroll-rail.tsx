"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuctionCard } from "@/components/cars/all-cars/auction-card";
import { SkeletonCard } from "@/components/cars/all-cars/car-grid-skeleton";
import { IconButton, LinkButton } from "@/components/common";
import { ArrowRightIcon, CarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { CarView } from "@/types/car.type";

/**
 * An import hub's „Актуални коли от …" (boards `im-hub-*`, `im-hub-states`, `im-hub-flow` frames 3–4): the title with
 * „Вижте всички" and two arrows, and the cards in a row that scrolls and snaps — 4 on a desktop (5 from 1800 px, 6 from
 * 2300 px), 3 under 1440 px, 2 on a tablet and 1,16 on a phone, where the arrows give way to a swipe. An arrow moves
 * one card and is disabled at its end. The row never moves by itself (today's grid didn't), so it has no pause button.
 *
 * - `cars === null`: loading — four card skeletons, both arrows disabled.
 * - No cars: the title and „Вижте всички", and `emptyText` in place of the row.
 */
export function CarScrollRail({
  title,
  allHref,
  cars,
  emptyText,
}: {
  title: string;
  allHref: string;
  cars: CarView[] | null;
  emptyText?: string;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [cars, measure]);

  // One card (and its gap) per press; instant under reduced motion.
  const go = (dir: 1 | -1) => {
    const el = railRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: smooth ? "smooth" : "auto" });
  };

  const loading = cars === null;
  const empty = cars !== null && cars.length === 0;
  const prevOff = loading || atStart;
  const nextOff = loading || atEnd;

  return (
    <>
      <div className="sa-sh">
        <div className="sa-sh__l">
          <h2 className="type-h2">{title}</h2>
        </div>
        <div className="sa-sh__r">
          <div className="im-railnav">
            <LinkButton href={allHref} variant="txt" size="md">
              Вижте всички
              <ArrowRightIcon />
            </LinkButton>
            {empty ? null : (
              <>
                <IconButton
                  label="Назад"
                  disabled={prevOff}
                  className={prevOff ? "im-dis" : undefined}
                  onClick={() => go(-1)}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  label="Напред"
                  disabled={nextOff}
                  className={nextOff ? "im-dis" : undefined}
                  onClick={() => go(1)}
                >
                  <ChevronRightIcon />
                </IconButton>
              </>
            )}
          </div>
        </div>
      </div>
      {loading ? (
        <div className="im-rail" aria-busy="true" aria-label={title}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : empty ? (
        <p className="im-empty">
          <span className="im-ic">
            <CarIcon />
          </span>
          <span>{emptyText}</span>
        </p>
      ) : (
        <div ref={railRef} className="im-rail" role="list" aria-label={title}>
          {cars.map((car) => (
            <div key={car.href} role="listitem">
              <AuctionCard car={car} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
