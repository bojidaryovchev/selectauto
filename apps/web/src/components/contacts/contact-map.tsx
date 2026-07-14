import { Container, Reveal, SectionHeader } from "@/components/common";
import { BUSINESS } from "@/constants";

// Exact showroom pin (ул. Север 64, Пловдив) — the coordinates the live
// selectauto.bg Google embed uses. A lat,lng query lands precisely on the pin,
// unlike geocoding the free-text address (which drifts). Kept in sync with
// BUSINESS.geo, which feeds the LocalBusiness JSON-LD.
const MAP_SRC =
  `https://www.google.com/maps?q=${BUSINESS.geo.latitude},${BUSINESS.geo.longitude}` +
  "&z=16&output=embed";

/** Embedded Google map locating the showroom. */
export function ContactMap() {
  return (
    <section className="pb-22 max-md:pb-14.5">
      <Container>
        <SectionHeader
          eyebrow="Локация"
          title="Вижте ни на картата"
          subtitle="Лесно паркиране · Бърз достъп"
          className="mb-8.5"
        />

        <Reveal delay={0.08}>
          <div className="overflow-hidden rounded-[30px] border border-line shadow-card-strong">
            <iframe
              src={MAP_SRC}
              title="SelectAuto — гр. Пловдив, ул. Север 64"
              className="block h-115 w-full max-md:h-85"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
