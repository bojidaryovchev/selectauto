/**
 * Location card with an embedded Google map for the lot's coordinates. Uses the
 * keyless `maps?q=lat,lng&output=embed` iframe (same pattern as the contacts-page
 * map — no API key, no client JS). Shown for US Copart/IAAI lots, which carry
 * `location.latitude/longitude` for the (public) auction branch; ENCAR lots have no
 * coordinates, so the page falls back to the text-only location card. The map is
 * region-level (z=11) — enough to place the branch/state without implying a precise
 * street pin. Lazy-loaded so it never competes with the gallery for LCP.
 */
export function CarLocationMap({ lat, lng, location }: { lat: number; lng: number; location?: string }) {
  const src = `https://www.google.com/maps?q=${lat},${lng}&z=11&output=embed`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="px-5 py-4">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Локация</span>
        {location ? <span className="text-sm font-bold text-ink">{location}</span> : null}
      </div>
      <iframe
        src={src}
        title={location ? `Локация — ${location}` : "Локация на автомобила"}
        className="block h-52 w-full border-t border-line"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
