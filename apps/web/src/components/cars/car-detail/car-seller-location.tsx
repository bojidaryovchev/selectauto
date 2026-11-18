import { MapEmbed } from "@/components/contacts/map-embed";

/**
 * The seller and the location in one panel (boards `cd-*`, `.cd-sl`): „Продавач" with the insurer's or seller's logo
 * on a light plate (IAAI) and the name, „Локация" with the place, and under them a Google map of the lot's coordinates
 * when it has them (US Copart/IAAI branches, Copart Canada). The map is the keyless `maps?q=lat,lng&output=embed`
 * iframe, region-level (z=11): enough to place the branch without implying a precise street pin. It loads only when
 * the visitor presses „Заредете картата" — the contacts page's click-to-load map, because Google sets its cookies the
 * moment the iframe loads (owner decision 33, C1; it loaded on scroll before). ENCAR lots have no coordinates, so they
 * show the place only. Renders nothing when there is neither a seller nor a place.
 */
export function CarSellerLocation({
  seller,
  location,
  geo,
}: {
  seller?: { name?: string; logo?: string };
  location?: string;
  geo?: { lat: number; lng: number };
}) {
  const hasSeller = !!(seller?.name || seller?.logo);
  if (!hasSeller && !location && !geo) return null;

  return (
    <section className="sa-pnl cd-sl">
      {hasSeller || location ? (
        <div className="cd-sl__row">
          {hasSeller ? (
            <div className="cd-sl__item">
              <span className="sa-label">Продавач</span>
              <div className="cd-seller">
                {seller?.logo ? (
                  <span className="cd-slogo">
                    {/* Insurer/seller logo (IAAI). Plain <img>: a remote logo, may be SVG. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={seller.logo} alt={seller.name ? `${seller.name} лого` : ""} />
                  </span>
                ) : null}
                {seller?.name ? <b>{seller.name}</b> : null}
              </div>
            </div>
          ) : null}
          {location ? (
            <div className="cd-sl__item">
              <span className="sa-label">Локация</span>
              <b>{location}</b>
            </div>
          ) : null}
        </div>
      ) : null}
      {geo ? (
        <MapEmbed
          look="panel"
          src={`https://www.google.com/maps?q=${geo.lat},${geo.lng}&z=11&output=embed`}
          title={location ? `Локация — ${location}` : "Локация на автомобила"}
        />
      ) : null}
    </section>
  );
}
