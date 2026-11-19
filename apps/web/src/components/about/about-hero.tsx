import { LinkButton, Reveal } from "@/components/common";
import { GavelIcon, MessageIcon, TruckIcon } from "@/components/icons";
import { HeroVideo } from "./hero-video";

const HERO_POINTS = [
  { Icon: MessageIcon, text: "Консултация и помощ при избор" },
  { Icon: GavelIcon, text: "Участие в търгове в Корея, САЩ и Канада" },
  { Icon: TruckIcon, text: "Организация на транспорт и регистрация" },
];

/**
 * About hero (board `in-za-nas`): the video behind a dark veil and the hero glow, the H1 with its orange words, the
 * lead and two actions, and the glass card „Какво получавате с нас" with its three points. Night in both themes: its
 * text and glass sit on the darkened video (styles/tokens.css, light mode).
 */
export function AboutHero() {
  return (
    <section className="in-vh" data-theme="dark">
      <HeroVideo />
      <div className="sa-wrap in-vh__in">
        <div className="in-vh__copy">
          <h1 className="type-display">
            Премиум подход към <em className="sa-em">вноса на автомобили</em>
          </h1>
          <p className="sa-lead">
            В SelectAuto изграждаме сигурен, ясен и професионално управляван процес — от правилния избор до
            логистиката, регистрацията и финалното предаване.
          </p>
          <div className="in-vh__act">
            <LinkButton href="/kontakti" variant="pri" size="xl">
              Свържете се с нас
            </LinkButton>
            <LinkButton href="/vsichki-avtomobili" variant="sec" size="xl" className="bg-[rgba(12,13,16,.5)]">
              Разгледайте автомобилите
            </LinkButton>
          </div>
        </div>

        <Reveal delay={0.16}>
          <aside className="sa-pnl in-glass" aria-labelledby="in-zn-get">
            <h2 className="type-h3" id="in-zn-get">
              Какво получавате с нас
            </h2>
            <p className="sa-p">
              Не просто достъп до автомобили, а експертна преценка, прозрачност и пълен контрол на всяка стъпка.
            </p>
            <ul className="in-checks">
              {HERO_POINTS.map(({ Icon, text }) => (
                <li key={text}>
                  <Icon />
                  {text}
                </li>
              ))}
            </ul>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
