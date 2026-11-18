import { Reveal } from "@/components/common";

/**
 * The contacts page's head band (board `in-kontakti`): the title and the line under it, on the night ground with the
 * hero glow. The stock photo the page used to sit on is gone, as the boards draw it (no stock images).
 */
export function ContactHero() {
  return (
    <section className="in-head">
      <div className="sa-wrap in-head__in">
        <Reveal>
          <div className="flex flex-col gap-5">
            <h1 className="type-display">Контакти</h1>
            <p className="sa-lead">Свържете се с нас бързо и лесно – ние сме тук, за да ви съдействаме!</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
