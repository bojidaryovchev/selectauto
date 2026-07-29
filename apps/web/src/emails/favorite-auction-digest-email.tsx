import { Button, Heading, Hr, Img, Link, Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";

/** One favourite car whose auction is today, pre-formatted by the caller. */
export type DigestCar = {
  /** "2019 BMW X5" — display title. */
  title: string;
  /** Absolute link to the car's detail page. */
  url: string;
  /**
   * Absolute image URL, or undefined when the listing has no photo. Rendered as
   * a clickable thumbnail at 536px wide. Two shapes reach this, both large
   * enough for that width: the AuctionsAPI CDN `.webp` (800–1280px) for most
   * sources, and a Copart `_ful.jpg` (960×720) for Copart lots. `alt` carries
   * the title so clients that don't render WebP (classic Outlook desktop) still
   * show something — a concern that does NOT apply to the Copart JPEGs.
   */
  image?: string;
  /** Formatted price ("32 500 $") or undefined when unpriced. */
  price?: string;
  /** Auction lot number ("Търг № …"). */
  lotNumber?: string;
  /** Auction time formatted in Europe/Sofia, or undefined. */
  auctionTime?: string;
  /** Source badge ("Copart" / "IAAI" / …). */
  source?: string;
};

type FavoriteAuctionDigestEmailProps = {
  name?: string;
  /** The user's favourites whose auction is today (non-empty by construction). */
  cars: DigestCar[];
  /** Absolute link back to /lyubimi. */
  favoritesUrl: string;
};

/**
 * Daily digest emailed to a user who opted in on /lyubimi: their favourited cars
 * whose auction lands today. Each car shows its photo, title, and auction
 * details, and links to its detail page. A footer CTA links back to the
 * saved-cars list.
 *
 * The photo is whatever the catalog card uses (`CarView.image`) — for most
 * sources the AuctionsAPI CDN `i.auctionsapi.com` `.webp`, and for Copart lots a
 * `cs.copart.com` `_ful.jpg`. Both are hotlink-friendly from an email client's
 * image proxy: Copart's CDN was verified to serve 200 with no referer, no UA and
 * a foreign referer (incl. Gmail's `GoogleImageProxy`), and its assets do not
 * expire on any timescale that matters here (14-month-old lots still serve, and
 * this digest only ever covers auctions happening TODAY). WebP renders in
 * Gmail/Apple Mail/mobile/webmail; the `alt` (title) covers clients that don't
 * (classic Outlook desktop) — the Copart JPEGs render there natively.
 */
export function FavoriteAuctionDigestEmail({
  name,
  cars,
  favoritesUrl,
}: FavoriteAuctionDigestEmailProps) {
  const count = cars.length;
  const heading =
    count === 1 ? "1 от любимите ви е на търг днес" : `${count} от любимите ви са на търг днес`;

  return (
    <EmailLayout preview={heading}>
      <Heading className="m-0 mb-4 text-[24px] font-black text-ink-strong">{heading}</Heading>
      <Text className="m-0 mb-5 text-[16px] leading-[1.7] text-ink">
        Здравейте{name ? ` ${name}` : ""}, търгът за следните запазени от вас автомобили е днес.
        Разгледайте детайлите навреме.
      </Text>

      {cars.map((car, index) => (
        <Section key={`${car.url}-${index}`}>
          {index > 0 ? <Hr className="my-4 border-line" /> : null}
          {car.image ? (
            <Link href={car.url} className="block no-underline">
              <Img
                src={car.image}
                alt={car.title}
                width="536"
                className="mb-3 h-auto w-full rounded-xl border border-solid border-line"
              />
            </Link>
          ) : null}
          <Link
            href={car.url}
            className="m-0 mb-1 block text-[16px] font-bold text-brand-dark no-underline"
          >
            {car.title}
          </Link>
          <Text className="m-0 text-[14px] leading-[1.7] text-muted">
            {[
              car.auctionTime ? `Търг: ${car.auctionTime}` : null,
              car.price ? `Цена: ${car.price}` : null,
              car.lotNumber ? `Търг № ${car.lotNumber}` : null,
              car.source || null,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
        </Section>
      ))}

      <Section className="mb-2 mt-7 text-center">
        <Button
          href={favoritesUrl}
          className="box-border rounded-full bg-brand px-8 py-3.75 text-[15px] font-extrabold text-white no-underline"
        >
          Вижте любимите автомобили
        </Button>
      </Section>

      <Text className="m-0 mt-6 text-[13px] leading-[1.7] text-muted">
        Получавате този имейл, защото сте включили известията за търгове от страницата с любими
        автомобили. Можете да ги изключите по всяко време оттам.
      </Text>
    </EmailLayout>
  );
}
