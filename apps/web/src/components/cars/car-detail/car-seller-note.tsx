import { ExpandableSection } from "@/components/common";

/**
 * ENCAR seller free-text blurb (`details.description_en`, Korean fallback) — the dealer's own listing description
 * (boards `cd-korea*`). Collapsed by default behind „Описание от продавача" (it can be long), as before; opens to the
 * full text with its line breaks. Renders nothing when there's no description.
 */
export function CarSellerNote({ note }: { note: { en?: string; ko?: string } }) {
  const text = note.en || note.ko;
  if (!text) return null;

  return (
    <ExpandableSection title="Описание от продавача">
      <p className="cd-note">{text}</p>
    </ExpandableSection>
  );
}
