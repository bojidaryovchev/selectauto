import { Resend } from "resend";
import {
  CalculatorOfferEmail,
  CalculatorOfferNotificationEmail,
  CarfaxNotificationEmail,
  type DigestCar,
  FavoriteAuctionDigestEmail,
  InquiryNotificationEmail,
  PasswordResetEmail,
  VerificationEmail,
} from "@/emails";
import { formatBgDateTime } from "@/emails/theme";
import type { CarView } from "@/types/car.type";

/**
 * Resend client + the app's transactional/notification emails. Each send passes
 * a branded React email template (see `@/emails`, rendered by Resend via the
 * `react` prop) AND a plain-text version — the two form a multipart message so
 * clients that block HTML still get a readable fallback (and it helps
 * deliverability).
 *
 * The two info@selectauto.bg notifications (Carfax + inquiry) are plain-text
 * summaries. Sending is best-effort at the call site — the routes/actions log
 * failures but never fail the submission on an email error.
 */

// Sender address. Defaults to the production, domain-verified address. Override
// with RESEND_FROM to test before a domain is verified in Resend — set it to
// "SelectAuto <onboarding@resend.dev>" (Resend's shared test sender, which sends
// only to your own Resend-account email) to exercise the flow with no domain.
const FROM = process.env.RESEND_FROM || "SelectAuto <noreply@selectauto.bg>";
const TO = process.env.CARFAX_NOTIFY_EMAIL || "info@selectauto.bg";

let resendClient: Resend | null = null;

/**
 * The shared Resend client. Exported because the INBOUND side needs the same
 * instance: `lib/inbound-mail.ts` calls `emails.receiving.forward()` and the
 * webhook route calls `webhooks.verify()`. One client keeps the connection and
 * the (team-wide, 10 req/s) rate-limit budget in one place.
 */
export function getResend(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export type CarfaxNotification = {
  fullName: string;
  phone: string;
  email?: string;
  vin: string;
  carMake?: string;
  carModel?: string;
  message?: string;
  pageUrl?: string;
  createdAt: string;
};

export async function sendCarfaxNotification(data: CarfaxNotification) {
  const lines = [
    "Ново Carfax запитване",
    "",
    `Име: ${data.fullName}`,
    `Телефон: ${data.phone}`,
    `Имейл: ${data.email ?? ""}`,
    `VIN: ${data.vin}`,
    `Марка: ${data.carMake ?? ""}`,
    `Модел: ${data.carModel ?? ""}`,
    `Съобщение: ${data.message ?? ""}`,
    `Страница: ${data.pageUrl ?? ""}`,
    `Дата: ${data.createdAt}`,
  ];

  return getResend().emails.send({
    from: FROM,
    to: TO,
    replyTo: data.email || undefined,
    subject: `Ново Carfax запитване - ${data.fullName}`,
    react: CarfaxNotificationEmail(data),
    text: lines.join("\n"),
  });
}

export type InquiryNotification = {
  name: string;
  phone: string;
  specificModel?: string;
  brand?: string;
  model?: string;
  budget?: string;
  time?: string;
  finance?: string;
  pageUrl?: string;
  createdAt: string;
};

/**
 * Inquiry ("Безплатна консултация") notification email. Mirrors
 * `sendCarfaxNotification`: a plain-text summary of the quiz answers to the same
 * inbox, sent best-effort from the create-inquiry action.
 */
export async function sendInquiryNotification(data: InquiryNotification) {
  const lines = [
    "Ново запитване (Безплатна консултация)",
    "",
    `Име: ${data.name}`,
    `Телефон: ${data.phone}`,
    `Конкретен модел: ${data.specificModel ?? ""}`,
    `Марка: ${data.brand ?? ""}`,
    `Модел: ${data.model ?? ""}`,
    `Бюджет: ${data.budget ?? ""}`,
    `Срок: ${data.time ?? ""}`,
    `Финансиране: ${data.finance ?? ""}`,
    `Страница: ${data.pageUrl ?? ""}`,
    `Дата: ${data.createdAt}`,
  ];

  return getResend().emails.send({
    from: FROM,
    to: TO,
    subject: `Ново запитване - ${data.name}`,
    react: InquiryNotificationEmail(data),
    text: lines.join("\n"),
  });
}

/**
 * Calculator-offer emails (the /kalkulator gated-offer flow). One data shape
 * feeds both templates: the CUSTOMER email (the itemized breakdown they asked
 * for) and the INTERNAL notification (same numbers + contact, to the info@
 * inbox). Amounts arrive pre-formatted — the breakdown is computed and
 * formatted once in the create-calculator-offer action from the raw inputs.
 */
export type CalculatorOfferEmailData = {
  name: string;
  phone: string;
  email: string;
  marketLabel: string;
  /** Ordered, pre-formatted line items ("Мито (10%)" → "1 490 $"). */
  lines: { label: string; amount: string }[];
  totalFormatted: string;
  transit: string;
  ratesVerifiedAt: string;
  pageUrl?: string;
  createdAt: string;
};

/** The customer's copy of the estimate — the gated-offer deliverable. */
export async function sendCalculatorOfferToCustomer(data: CalculatorOfferEmailData) {
  const lines = [
    `Здравейте, ${data.name}!`,
    "",
    `Вашата ориентировъчна калкулация за внос от ${data.marketLabel}:`,
    "",
    ...data.lines.map((l) => `${l.label}: ${l.amount}`),
    `ОБЩО (ориентир): ${data.totalFormatted}`,
    "",
    `Ориентировъчен срок за доставка: ${data.transit}`,
    `Ставките са проверени към ${data.ratesVerifiedAt}.`,
    "",
    "Това е ориентировъчна оценка и НЕ представлява обвързваща оферта.",
    "За точна калкулация за конкретен автомобил отговорете на този имейл или се обадете на " +
      "+359 898 980 011.",
  ];

  return getResend().emails.send({
    from: FROM,
    to: data.email,
    replyTo: TO,
    subject: `Вашата калкулация за внос от ${data.marketLabel} — SelectAuto`,
    react: CalculatorOfferEmail(data),
    text: lines.join("\n"),
  });
}

/** The internal lead notification for the same submission. */
export async function sendCalculatorOfferNotification(data: CalculatorOfferEmailData) {
  const lines = [
    "Нов лийд от калкулатора",
    "",
    `Име: ${data.name}`,
    `Телефон: ${data.phone}`,
    `Имейл: ${data.email}`,
    `Пазар: ${data.marketLabel}`,
    ...data.lines.map((l) => `${l.label}: ${l.amount}`),
    `Общо: ${data.totalFormatted}`,
    `Страница: ${data.pageUrl ?? ""}`,
    `Дата: ${data.createdAt}`,
  ];

  return getResend().emails.send({
    from: FROM,
    to: TO,
    replyTo: data.email,
    subject: `Нов лийд от калкулатора - ${data.name} (${data.marketLabel})`,
    react: CalculatorOfferNotificationEmail(data),
    text: lines.join("\n"),
  });
}

/**
 * Auth emails — sent to the USER (not the info@ inbox) for the self-hosted
 * Auth.js email/password flows. We send them ourselves via Resend (the same client
 * + verified `noreply@selectauto.bg` sender). The link is built from APP_URL.
 */

/** Base URL for links in auth emails. Falls back to the production domain. */
function appUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.selectauto.bg"
  ).replace(/\/$/, "");
}

/** Sends the email-verification link to a newly registered user. */
export async function sendVerificationEmail(to: string, token: string, name?: string) {
  const link = `${appUrl()}/verify?token=${encodeURIComponent(token)}`;
  const lines = [
    `Здравейте${name ? ` ${name}` : ""},`,
    "",
    "Благодарим за регистрацията в SelectAuto. За да активирате профила си, потвърдете имейл адреса си през следния линк:",
    "",
    link,
    "",
    "Линкът е валиден 24 часа. Ако не сте се регистрирали, игнорирайте този имейл.",
    "",
    "Поздрави,",
    "Екипът на SelectAuto",
  ];
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Потвърдете имейла си — SelectAuto",
    react: VerificationEmail({ name, verifyUrl: link }),
    text: lines.join("\n"),
  });
}

/**
 * Favourites auction digest — sent to a user who opted in on /lyubimi, listing
 * their favourited cars whose auction is today. Sent by the daily Vercel cron
 * (api/cron/favorite-auction-alerts), one email per recipient. `cars` is
 * pre-formatted by the caller (title/price/lot/time already resolved); this only
 * builds the back-link and the plain-text fallback.
 */
export async function sendFavoriteAuctionDigest(
  to: string,
  data: { name?: string; cars: CarView[] },
) {
  const base = appUrl();
  const favoritesUrl = `${base}/lyubimi`;

  // Map the UI CarView rows to the presentational DigestCar shape: absolute
  // links (emails can't use relative paths) and the auction time formatted in
  // the showroom's timezone (Europe/Sofia).
  const cars: DigestCar[] = data.cars.map((car) => ({
    title: car.title,
    url: car.href.startsWith("http") ? car.href : `${base}${car.href}`,
    // Absolute image URL for the email client (relative /public paths, used only
    // by the static fallback data, get the base prefixed; DB rows already carry
    // an absolute source-CDN URL). Null image → omit the thumbnail.
    //
    // Deliberately the SAME `car.image` the catalog card uses, which the digest
    // template renders at 536px — WIDER than any card slot, so this surface was
    // the one most hurt by the old 144×108 Copart thumbnail (a 3.7× upscale) and
    // the one most improved by the `_ful` rewrite (see lib/car-mapper.ts).
    // NOTE: `car.imageFallback` is intentionally NOT applied here — an email has
    // no JS, so a dead URL degrades to the `alt` text rather than swapping. That
    // is acceptable because the rewrite is only ever applied to Copart URLs,
    // which were verified to serve 491/491, to survive 14+ months (no expiry),
    // and to ignore referer/UA (no hotlink blocking, incl. Gmail's image proxy).
    image: car.image
      ? car.image.startsWith("http")
        ? car.image
        : `${base}${car.image}`
      : undefined,
    price: car.price,
    lotNumber: car.lotNumber,
    auctionTime: car.saleDate ? formatBgDateTime(car.saleDate) : undefined,
    source: car.source,
  }));

  const count = cars.length;
  const heading =
    count === 1
      ? "1 от любимите ви автомобили е на търг днес"
      : `${count} от любимите ви автомобили са на търг днес`;

  const lines = [
    heading,
    "",
    `Здравейте${data.name ? ` ${data.name}` : ""},`,
    "",
    ...cars.map((car) =>
      [
        car.title,
        [
          car.auctionTime ? `Търг: ${car.auctionTime}` : null,
          car.price ? `Цена: ${car.price}` : null,
          car.lotNumber ? `Търг № ${car.lotNumber}` : null,
          car.source || null,
        ]
          .filter(Boolean)
          .join("  ·  "),
        car.url,
        "",
      ].join("\n"),
    ),
    `Вижте любимите автомобили: ${favoritesUrl}`,
  ];

  return getResend().emails.send({
    from: FROM,
    to,
    subject: heading,
    react: FavoriteAuctionDigestEmail({ name: data.name, cars, favoritesUrl }),
    text: lines.join("\n"),
  });
}

/** Sends the password-reset link to a user who requested it. */
export async function sendPasswordResetEmail(to: string, token: string, name?: string) {
  const link = `${appUrl()}/nova-parola?token=${encodeURIComponent(token)}`;
  const lines = [
    `Здравейте${name ? ` ${name}` : ""},`,
    "",
    "Получихме заявка за смяна на паролата за профила ви в SelectAuto. За да зададете нова парола, отворете следния линк:",
    "",
    link,
    "",
    "Линкът е валиден 1 час. Ако не сте поискали смяна на паролата, игнорирайте този имейл — профилът ви остава непроменен.",
    "",
    "Поздрави,",
    "Екипът на SelectAuto",
  ];
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Смяна на парола — SelectAuto",
    react: PasswordResetEmail({ name, resetUrl: link }),
    text: lines.join("\n"),
  });
}
