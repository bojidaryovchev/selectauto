/**
 * US-source certification / report chips (`raw_json.tags` — e.g. CERT-D, CERT-E,
 * AUTOCHECK, IV) shown under the car heading. Copart carries these on ~every lot;
 * they signal title-certification level and available history reports. Purely
 * informational, so a plain chip row. Renders nothing when there are no tags.
 */
export function CarTagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-md bg-[#eef2f7] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#334155] ring-1 ring-[#dbe3ec]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
