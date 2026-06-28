import { Container, Reveal } from "@/components/common";
import { FeatureCard } from "./feature-card";

/** The 01 / 15+ / 80+ feature-card row. */
export function AboutFeatures() {
  return (
    <section className="py-[88px] max-md:py-[58px]">
      <Container>
        <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-1">
          <Reveal>
            <FeatureCard variant="dark" number="01" title="Цялостни решения">
              Ние сме надежден партньор, който опростява целия процес — от
              първата консултация до крайната доставка.
            </FeatureCard>
          </Reveal>
          <Reveal delay={0.08}>
            <FeatureCard variant="orange" number="15+" title="Аукционни канали">
              Осигуряваме достъп до аукционни площадки в САЩ, Канада и Европа с
              правилен подбор и стратегия.
            </FeatureCard>
          </Reveal>
          <Reveal delay={0.16}>
            <FeatureCard variant="light" number="80+" title="Търга на ден">
              Богат избор, бърза реакция и реално изпълнение, съобразено с
              бюджета и целите ти.
            </FeatureCard>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
