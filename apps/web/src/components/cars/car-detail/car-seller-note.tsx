import { ExpandableSection } from "@/components/common";

/**
 * ENCAR seller free-text blurb (`details.description_en`, Korean fallback) — the
 * dealer's own listing description. Collapsed by default behind the shared
 * `ExpandableSection` (it can be long); opens with a fluid height animation to the
 * full text with line breaks preserved. Renders nothing when there's no description.
 */
export function CarSellerNote({ note }: { note: { en?: string; ko?: string } }) {
  const text = note.en || note.ko;
  if (!text) return null;

  return (
    <ExpandableSection title="Описание от продавача">
      <p className="whitespace-pre-line text-sm/relaxed text-muted">{text}</p>
    </ExpandableSection>
  );
}
