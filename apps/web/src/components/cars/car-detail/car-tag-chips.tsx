/**
 * US-source certification / report chips (`raw_json.tags` — e.g. CERT-D, CERT-E, AUTOCHECK, IV) under the car heading
 * (boards `cd-*`, the kit's `.sa-utag`). Copart carries these on ~every lot; they signal title-certification level and
 * available history reports. Purely informational. Renders nothing when there are no tags.
 */
export function CarTagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="cd-tags">
      {tags.map((tag) => (
        <span key={tag} className="sa-utag">
          {tag}
        </span>
      ))}
    </div>
  );
}
