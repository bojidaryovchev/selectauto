import { Container, Reveal } from "@/components/common";

/** The four scale/reach metrics, unified into one band (previously scattered
 *  across the feature cards as 01/15+/80+ and the media card's 5+). */
const STATS = [
  { value: "3", label: "Държави за търгове", note: "Корея · САЩ · Канада" },
  { value: "15+", label: "Аукционни канала", note: "с правилен подбор" },
  { value: "80+", label: "Търга на ден", note: "богат, актуален избор" },
  { value: "5+", label: "Пристанищни бази", note: "кратки срокове" },
];

/** Dark stats band — unifies every number on the page into one credible row. */
export function AboutStats() {
  return (
    <section className="bg-[linear-gradient(135deg,#0c0d10,#15171c)] py-16 max-md:py-12">
      <Container>
        <div className="grid grid-cols-4 gap-x-6 gap-y-10 max-[900px]:grid-cols-2">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={0.06 * i}>
              <div className="border-l border-white/12 pl-5 max-[900px]:pl-4">
                <div className="text-[clamp(40px,5vw,64px)] font-black leading-none text-[#ffd4aa]">
                  {stat.value}
                </div>
                <div className="mt-3 text-lg font-extrabold text-white max-md:text-base">
                  {stat.label}
                </div>
                <div className="mt-1 text-sm font-medium text-white/55">
                  {stat.note}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
