"use client";

import { useFilterNav } from "@/contexts/filter-nav-context";

/**
 * The results line above the catalog grid (board `ct-catalog`): „Намерени автомобили:" and the count, „Намерени
 * резултати:" on the past tab, or „Резултати от търсенето" for a lot / VIN search, which has no count. While a filter
 * change loads, a spinner sits beside it (board `ct-pending`). It is the h2 the cards' h3 titles sit under.
 *
 * `countLabel` comes formatted from the server („985 802", grouped by a no-break space), so server and browser
 * print the same characters.
 */
export function ResultsHeading({ mode, countLabel }: { mode: "active" | "past" | "search"; countLabel: string }) {
  const { pending } = useFilterNav();
  return (
    <h2 className="mt-[clamp(24px,2.6vw,40px)] mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[15px] leading-[1.4] font-semibold text-tx2">
      {mode === "search" ? (
        "Резултати от търсенето"
      ) : (
        <>
          {mode === "past" ? "Намерени резултати: " : "Намерени автомобили: "}
          <strong className="font-display text-xl leading-none font-bold tracking-[-0.01em] text-tx">{countLabel}</strong>
        </>
      )}
      {pending ? <span className="sa-spin self-center" aria-hidden="true" /> : null}
    </h2>
  );
}
