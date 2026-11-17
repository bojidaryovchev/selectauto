/** One placeholder bar of the given size (the kit's `.sa-sk`). */
function Bar({ className }: { className: string }) {
  return <span className={`sa-sk block ${className}`} />;
}

/**
 * A placeholder card in the exact shape of the car card (board `kit-cards`, „Зарежда се"): photo, status strip,
 * plate and two title lines, the 11 fields, the price row and the action row. Used as the `loading.tsx` fallback,
 * and — individually — as the in-place placeholder the virtualized grid renders for cards that haven't loaded yet,
 * so pages fill in without moving anything. `h-full` stretches it to the row height in mixed rows.
 */
export function SkeletonCard() {
  return (
    <article className="sa-car h-full text-tx" aria-busy="true" aria-label="Зареждане">
      <div className="sa-car__ph sa-sk rounded-none" />
      <div className="sa-car__clk">
        <Bar className="h-2.5 w-22.5" />
        <Bar className="h-3 w-20" />
      </div>
      <div className="sa-car__b">
        <div className="sa-car__hd">
          <Bar className="size-8 rounded-sm" />
          <span className="sa-stack flex-1 gap-2">
            <Bar className="h-3.5 w-[90%]" />
            <Bar className="h-3.5 w-[55%]" />
          </span>
        </div>
        <div className="sa-car__dl">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Bar className="h-2.25 w-[60%]" />
              <Bar className="mt-1.5 h-3 w-[80%]" />
            </div>
          ))}
          <div className="is-wide">
            <Bar className="h-2.25 w-[30%]" />
            <Bar className="mt-1.5 h-3 w-1/2" />
          </div>
        </div>
        <div className="sa-car__pr">
          <Bar className="h-2.5 w-12.5" />
          <Bar className="h-5 w-22.5" />
        </div>
        <div className="sa-car__act">
          <Bar className="h-11 flex-1" />
          <Bar className="size-11" />
          <Bar className="size-11" />
        </div>
      </div>
    </article>
  );
}

/** A grid of N placeholder cards, in the catalog's grid (columns of at least 280 px). */
export function CarGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="sa-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
