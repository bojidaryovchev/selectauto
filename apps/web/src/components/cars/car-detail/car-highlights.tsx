import type { CarDetailSpec } from "@/types/car-detail.type";

/**
 * The at-a-glance highlights under the car title (boards `cd-*`, the kit's `.sa-hl`): year · mileage · fuel ·
 * condition, each its label over its value. Each is a present-only spec; the row renders nothing when empty.
 */
export function CarHighlights({ highlights }: { highlights: CarDetailSpec[] }) {
  if (highlights.length === 0) return null;

  return (
    <div className="sa-hl">
      {highlights.map((h) => (
        <span key={h.label}>
          <small>{h.label}</small>
          {h.value}
        </span>
      ))}
    </div>
  );
}
