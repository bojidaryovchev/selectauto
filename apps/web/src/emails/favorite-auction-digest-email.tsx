import { Button, Heading, Hr, Link, Section, Text } from "react-email";
import { EmailLayout } from "./email-layout";

/** One favourite car whose auction is today, pre-formatted by the caller. */
export type DigestCar = {
  /** "2019 BMW X5" — display title. */
  title: string;
  /** Absolute link to the car's detail page. */
  url: string;
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
 * whose auction lands today. Text/data-focused (no auction photos — the upstream
 * Copart/IAAI image URLs expire and block hotlinking), matching the other
 * SelectAuto emails. Each car links to its detail page; a footer CTA links back
 * to the saved-cars list.
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
