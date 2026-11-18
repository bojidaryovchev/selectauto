import { Reveal } from "@/components/common";

/** The four scale/reach metrics, unified into one band (previously scattered
 *  across the feature cards as 01/15+/80+ and the media card's 5+). */
const STATS = [
  { value: "3", label: "Държави за търгове", note: "Корея · САЩ · Канада" },
  { value: "15+", label: "Аукционни канала", note: "с правилен подбор" },
  { value: "80+", label: "Търга на ден", note: "богат, актуален избор" },
  { value: "5+", label: "Пристанищни бази", note: "кратки срокове" },
];

/** The figures band (board `in-za-nas`): four tiles, two per row below 1024 px. */
export function AboutStats() {
  return (
    <section className="sa-band sa-band--s1 sa-band--tight">
      <div className="sa-wrap">
        <div className="in-stats">
          {STATS.map((stat, i) => (
            // The reveal wrapper is the tile itself (`.in-stats>div`).
            <Reveal key={stat.label} delay={0.06 * i}>
              <b>{stat.value}</b>
              <strong>{stat.label}</strong>
              <span>{stat.note}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
