import { SkeletonCard } from "@/components/cars/all-cars";

/** Which placeholder cards show by width (board `hm-hub-loading`): 2 on a phone, 4 on a tablet, 12 from 1024 px. */
const CARDS = Array.from({ length: 12 }, (_, i) => (i < 2 ? "" : i < 4 ? "sa-hide-ph" : "sa-only-dt"));

/**
 * The make and model hubs while their body streams in (board `hm-hub-loading`): the header's crumb, plate and title,
 * two lines of lead and the count, then the card grid's placeholders.
 */
export function HubSkeleton() {
  return (
    <div aria-busy="true">
      <section className="hm-hub">
        <div className="sa-wrap hm-hub__in hm-ld">
          <span className="sa-sk h-4 w-[min(256px,70%)]" />
          <div className="hm-ld__t">
            <span className="sa-sk hm-ld__p" />
            <span className="sa-sk h-10 max-w-180 flex-1" />
          </div>
          <span className="sa-sk h-4 w-[min(50%,560px)]" />
          <span className="sa-sk h-4 w-[min(38%,420px)]" />
          <span className="sa-sk h-6 w-55" />
        </div>
      </section>
      <section className="sa-band sa-band--tight">
        <div className="sa-wrap">
          <div className="sa-grid">
            {/* Each placeholder in a one-cell grid, so the card fills its column and the row's height. */}
            {CARDS.map((cls, i) => (
              <div key={i} className={`grid min-w-0 ${cls}`}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
