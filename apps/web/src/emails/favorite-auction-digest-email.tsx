import { Img, Link, Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";
import { Cta, Paragraph, Title } from "./parts";

/** One favourite car whose auction is today, pre-formatted by the caller. */
export type DigestCar = {
  /** "2019 BMW X5" — display title. */
  title: string;
  /** Absolute link to the car's detail page. */
  url: string;
  /**
   * Absolute image URL, or undefined when the listing has no photo. Rendered as
   * a clickable photo across the card (518px). Two shapes reach this, both large
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
 * whose auction lands today (board `ms-em-digest`). Each car is a card with its photo, title, and auction
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
export function FavoriteAuctionDigestEmail({ name, cars, favoritesUrl }: FavoriteAuctionDigestEmailProps) {
  const count = cars.length;
  const heading = count === 1 ? "1 от любимите ви е на търг днес" : `${count} от любимите ви са на търг днес`;

  return (
    <EmailLayout preview={heading}>
      <Title>{heading}</Title>
      <Paragraph spacing="mb-[22px]">
        Здравейте{name ? ` ${name}` : ""}, търгът за следните запазени от вас автомобили е днес. Разгледайте детайлите
        навреме.
      </Paragraph>

      {cars.map((car, index) => (
        <Section
          key={`${car.url}-${index}`}
          className="mb-4 overflow-hidden rounded-[12px] border border-solid border-line"
        >
          {car.image ? (
            <Link href={car.url} className="block no-underline">
              <Img src={car.image} alt={car.title} width="518" className="block h-auto w-full bg-photo" />
            </Link>
          ) : null}
          <Section className="px-[18px] pt-3.5 pb-4">
            <Link
              href={car.url}
              className="m-0 mb-1 block text-[17px] leading-[1.35] font-extrabold text-ink no-underline"
            >
              {car.title}
            </Link>
            <Text className="m-0 text-[14px] leading-[1.6] font-medium text-muted">
              {[
                car.auctionTime ? `Търг: ${car.auctionTime}` : null,
                car.price ? `Цена: ${car.price}` : null,
                // A no-break space keeps „№" with its number.
                car.lotNumber ? `Търг №\u00a0${car.lotNumber}` : null,
                car.source || null,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
          </Section>
        </Section>
      ))}

      <Cta href={favoritesUrl} spacing="mt-[26px] mb-6">
        Вижте любимите автомобили
      </Cta>

      <Text className="m-0 text-[13px] leading-[1.6] font-medium text-muted">
        Получавате този имейл, защото сте включили известията за търгове от страницата с любими автомобили. Можете да ги
        изключите по всяко време оттам.
      </Text>
    </EmailLayout>
  );
}
