import { LinkButton, SectionHeading } from "@/components/common";
import { ArrowRightIcon, StarIcon } from "@/components/icons";
import { getGoogleReviews } from "@/lib/google-reviews";

/**
 * Server island: up to three real Google reviews for the country hubs' social-proof block (same daily-cached Places
 * read as /otzivi — see lib/google-reviews; board `im-hub-states`). Fail-open: renders nothing while the Places key is
 * unconfigured or on upstream errors, so a hub never blocks on it. Wrap in <Suspense fallback={null}>.
 *
 * Shown as CONTENT only — no Review/AggregateRating schema (self-serving review markup is ineligible for rich results
 * per Google's policy; see /otzivi).
 */
export async function HubTestimonials() {
  const data = await getGoogleReviews();
  if (!data || data.reviews.length === 0) return null;
  const reviews = data.reviews.slice(0, 3);
  return (
    <section className="sa-band sa-band--tight sa-band--line">
      <div className="sa-wrap">
        <SectionHeading
          title="Какво казват клиентите"
          actions={
            <LinkButton href="/otzivi" variant="txt" size="md">
              Всички отзиви
              <ArrowRightIcon />
            </LinkButton>
          }
        />
        <div className="sa-grid sa-grid--3">
          {reviews.map((r) => {
            const stars = Math.max(1, Math.min(5, Math.round(r.rating)));
            return (
              <figure key={`${r.author}-${r.text.slice(0, 24)}`} className="im-rev">
                <p className="im-stars" aria-label={`Оценка ${r.rating} от 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon key={i} className={i < stars ? undefined : "opacity-25"} />
                  ))}
                </p>
                <blockquote className="line-clamp-5 text-[15px]/relaxed text-tx2">{r.text}</blockquote>
                <figcaption className="text-[13px] font-semibold text-tx3">{r.author}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
