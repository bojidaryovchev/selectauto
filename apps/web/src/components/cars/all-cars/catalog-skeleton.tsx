import { CarGridSkeleton } from "./car-grid-skeleton";

/** One placeholder bar (the kit's `.sa-sk`). */
function Bar({ className }: { className: string }) {
  return <span className={`sa-sk block max-w-full ${className}`} />;
}

/** A field's placeholder: the label, then the 48 px control. */
function FieldBar({ className = "" }: { className?: string }) {
  return (
    <div className={`sa-fld ${className}`}>
      <Bar className="h-3 w-[45%]" />
      <Bar className="h-12 w-full rounded-md" />
    </div>
  );
}

/**
 * The catalog while its first page loads (board `ct-loading`; `app/vsichki-avtomobili/loading.tsx`): the title, the
 * filter console shaped like the real one (on a phone, the tab and „Филтри"), the results line and 12 placeholder
 * cards. Nothing is announced but the cards' own „Зареждане".
 */
export function CatalogSkeleton() {
  return (
    <section className="sa-wrap pt-[clamp(24px,3vw,48px)] pb-[clamp(56px,6vw,96px)]">
      <div className="mb-[clamp(18px,2vw,28px)]">
        <Bar className="h-11 w-[min(440px,80%)] rounded-md" />
      </div>

      <div className="hidden rounded-lg border border-hair bg-s1 sm:block">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3.5 border-b border-hair px-[clamp(16px,1.6vw,24px)] py-4">
          <Bar className="h-12 w-57 rounded-[10px]" />
          <div className="sa-fld order-3 basis-full lg:order-0 lg:max-w-130 lg:flex-[1_1_320px]">
            <Bar className="h-3 w-37.5" />
            <Bar className="h-12 w-full rounded-md" />
          </div>
          <Bar className="ml-auto h-12 w-50 rounded-md" />
        </div>
        <div className="flex flex-col gap-5 px-[clamp(16px,1.6vw,24px)] pt-5 pb-6">
          <div className="grid grid-cols-12 gap-4 min-[90rem]:grid-cols-[repeat(3,minmax(0,2.4fr))_repeat(4,minmax(0,1fr))]">
            <FieldBar className="col-span-6 lg:col-span-4 min-[90rem]:col-span-1" />
            <FieldBar className="col-span-6 lg:col-span-4 min-[90rem]:col-span-1" />
            <FieldBar className="col-span-4 min-[90rem]:col-span-1" />
            <FieldBar className="col-span-2 lg:col-span-3 min-[90rem]:col-span-1" />
            <FieldBar className="col-span-2 lg:col-span-3 min-[90rem]:col-span-1" />
            <FieldBar className="col-span-2 lg:col-span-3 min-[90rem]:col-span-1" />
            <FieldBar className="col-span-2 lg:col-span-3 min-[90rem]:col-span-1" />
          </div>
          <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
            <div className="sa-fld">
              <Bar className="h-3 w-13.5" />
              <Bar className="h-12 w-105 rounded-[10px]" />
            </div>
            <Bar className="h-7 w-43 rounded-[14px]" />
            <div className="sa-fld">
              <Bar className="h-3 w-10" />
              <Bar className="h-10 w-155 rounded-[20px]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-hair pt-5 lg:grid-cols-4">
            <FieldBar />
            <FieldBar />
            <FieldBar />
            <FieldBar />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:hidden">
        <Bar className="h-12 w-full rounded-[10px]" />
        <Bar className="h-12 w-full rounded-md" />
      </div>

      <div className="mt-[clamp(24px,2.6vw,40px)] mb-4">
        <Bar className="h-4 w-57.5" />
      </div>

      <CarGridSkeleton count={12} />
    </section>
  );
}
