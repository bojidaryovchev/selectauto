import { Container, Reveal, SectionHeader } from "@/components/common";

const MAP_SRC =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("гр. Пловдив, ул. Север 64") +
  "&output=embed";

/** Embedded Google map locating the showroom. */
export function ContactMap() {
  return (
    <section className="pb-[88px] max-md:pb-[58px]">
      <Container>
        <SectionHeader
          eyebrow="Локация"
          title="Вижте ни на картата"
          subtitle="Лесно паркиране · Бърз достъп"
          className="mb-[34px]"
        />

        <Reveal delay={0.08}>
          <div className="overflow-hidden rounded-[30px] border border-line shadow-card-strong">
            <iframe
              src={MAP_SRC}
              title="SelectAuto — гр. Пловдив, ул. Север 64"
              className="block h-[460px] w-full max-md:h-[340px]"
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
