/**
 * Shimmer placeholder cards for the catalog: used as the `loading.tsx` fallback
 * (Suspense) and as the "loading more" indicator at the bottom of the grid.
 * Mirrors the AuctionCard's rough proportions so the layout doesn't jump.
 */
function SkeletonCard() {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
      <div className="aspect-[40/26] w-full bg-[#e9e9ea]" />
      <div className="h-[38px] bg-[#2f343c]/90" />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3.5">
        <div className="h-5 w-3/4 rounded bg-[#e9e9ea]" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-2.5 w-12 rounded bg-[#eee]" />
              <div className="h-3.5 w-16 rounded bg-[#e9e9ea]" />
            </div>
          ))}
        </div>
        <div className="mt-auto h-[46px] w-full rounded-full bg-[#e9e9ea]" />
      </div>
    </div>
  );
}

/** A grid of N shimmer cards. */
export function CarGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
