import { Reveal, SectionHeading } from "@/components/common";
import { BUSINESS } from "@/constants";
import { MapEmbed } from "./map-embed";

// Exact showroom pin (ул. Север 64, Пловдив) — the coordinates the live
// selectauto.bg Google embed uses. A lat,lng query lands precisely on the pin,
// unlike geocoding the free-text address (which drifts). Kept in sync with
// BUSINESS.geo, which feeds the LocalBusiness JSON-LD.
const MAP_SRC =
  `https://www.google.com/maps?q=${BUSINESS.geo.latitude},${BUSINESS.geo.longitude}` +
  "&z=16&output=embed";

/**
 * Embedded Google map locating the showroom (board `in-kontakti`). The actual iframe is loaded
 * click-to-consent via <MapEmbed> — Google Maps sets third-party cookies on load,
 * so under ePrivacy it must not mount until the user opts in.
 */
export function ContactMap() {
  return (
    <section className="sa-band sa-band--line">
      <div className="sa-wrap">
        <SectionHeading eyebrow="Локация" title="Вижте ни на картата" lead="Лесно паркиране · Бърз достъп" />
        <Reveal delay={0.08}>
          <MapEmbed
            src={MAP_SRC}
            title="SelectAuto — гр. Пловдив, ул. Север 64"
            addressLabel={`${BUSINESS.streetAddress}, ${BUSINESS.postalCode} ${BUSINESS.city}`}
          />
        </Reveal>
      </div>
    </section>
  );
}
