import type { CarDetailSpec } from "@/types/car-detail.type";

/**
 * The at-a-glance highlight chips under the car title (year · mileage · fuel ·
 * condition) — the legacy "info chips" row. Each is a present-only spec; the row
 * renders nothing when empty.
 */
export function CarHighlights({ highlights }: { highlights: CarDetailSpec[] }) {
  if (highlights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {highlights.map((h) => (
        <span
          key={h.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-ink shadow-sm"
        >
          <span className="text-[11px] uppercase tracking-wide text-muted">{h.label}</span>
          <span className="font-bold">{h.value}</span>
        </span>
      ))}
    </div>
  );
}
