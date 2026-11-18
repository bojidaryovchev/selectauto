import { buttonClasses, LinkButton, Reveal } from "@/components/common";
import { FileSearchIcon, GaugeIcon, TriangleAlertIcon } from "@/components/icons";

const CHECK_POINTS = [
  { Icon: FileSearchIcon, text: "Проверка на VIN номер" },
  { Icon: TriangleAlertIcon, text: "История на щети и инциденти" },
  { Icon: GaugeIcon, text: "Данни за пробег и предишни собственици" },
];

/**
 * Carfax page hero (board `in-carfax`): the display title with its orange words, the lead, „Изпратете запитване"
 * (to the form) and „Свържете се с нас", and the card „Какво можете да проверите". The night ground with the hero
 * glow; the stock photo is gone (no stock images).
 */
export function CarfaxHero({ actionsId, formId }: { actionsId: string; formId: string }) {
  return (
    <section className="in-hero">
      <div className="sa-wrap in-hero__in">
        <Reveal>
          <div className="in-hero__copy">
            <h1 className="type-display">
              Поръчайте <em className="sa-em">Carfax проверка</em> за избрания автомобил
            </h1>
            <p className="sa-lead">
              Получете по-ясна представа за историята на автомобила — пробег, инциденти, собственици и важни записи
              преди да вземете решение.
            </p>
            <div id={actionsId} className="in-hero__act">
              <a href={`#${formId}`} className={buttonClasses({ variant: "pri", size: "xl" })}>
                Изпратете запитване
              </a>
              <LinkButton href="/kontakti" variant="sec" size="xl">
                Свържете се с нас
              </LinkButton>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <aside className="sa-pnl in-hero__card" aria-labelledby="in-cf-check">
            <h2 className="type-h3" id="in-cf-check">
              Какво можете да проверите
            </h2>
            <p className="sa-p">
              Историята на автомобила често казва повече от самата обява. Проверете важните детайли преди покупка.
            </p>
            <ul className="in-checks">
              {CHECK_POINTS.map(({ Icon, text }) => (
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
