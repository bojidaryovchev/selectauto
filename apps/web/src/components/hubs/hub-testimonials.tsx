import Link from "next/link";
import { StarIcon } from "@/components/icons";
import { getGoogleReviews } from "@/lib/google-reviews";

/**
 * Server island: up to three real Google reviews for the country hubs' social-
 * proof block (same daily-cached Places read as /otzivi — see lib/google-reviews).
 * Fail-open: renders nothing while the Places key is unconfigured or on upstream
 * errors, so a hub never blocks on it. Wrap in <Suspense fallback={null}>.
 *
 * Shown as CONTENT only — no Review/AggregateRating schema (self-serving review
 * markup is ineligible for rich results per Google's policy; see /otzivi).
 */
export async function HubTestimonials() {
  const data = await getGoogleReviews();
  if (!data || data.reviews.length === 0) return null;
  const reviews = data.reviews.slice(0, 3);
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-black text-ink">Какво казват клиентите</h2>
        <Link href="/otzivi" className="whitespace-nowrap text-sm font-bold text-brand-dark hover:underline">
          Всички отзиви →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {reviews.map((r) => (
          <figure
            key={`${r.author}-${r.text.slice(0, 24)}`}
            className="rounded-2xl border border-line bg-white p-5 shadow-card"
          >
            <p className="mb-2 flex items-center gap-0.5" aria-label={`Оценка ${r.rating} от 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon
                  key={i}
                  className={`size-4 ${i < Math.max(1, Math.min(5, Math.round(r.rating))) ? "text-brand-dark" : "text-line"}`}
                />
              ))}
            </p>
            <blockquote className="mb-3 line-clamp-5 text-sm/relaxed text-[#3d4046]">{r.text}</blockquote>
            <figcaption className="text-xs font-semibold text-muted">{r.author}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
