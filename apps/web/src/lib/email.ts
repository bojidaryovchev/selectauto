import { Resend } from "resend";
import {
  CarfaxNotificationEmail,
  InquiryNotificationEmail,
  PasswordResetEmail,
  VerificationEmail,
} from "@/emails";

/**
 * Resend client + the app's transactional/notification emails. Each send passes
 * a branded React email template (see `@/emails`, rendered by Resend via the
 * `react` prop) AND a plain-text version — the two form a multipart message so
 * clients that block HTML still get a readable fallback (and it helps
 * deliverability).
 *
 * The two info@selectauto.bg notifications (Carfax + inquiry) mirror the old
 * WordPress `wp_mail` summaries. Sending is best-effort at the call site — the
 * routes/actions log failures but never fail the submission on an email error.
 */

const FROM = "SelectAuto <noreply@selectauto.bg>";
const TO = process.env.CARFAX_NOTIFY_EMAIL || "info@selectauto.bg";

let resendClient: Resend | null = null;

function getResend(): Resend {
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
 * Auth emails — sent to the USER (not the info@ inbox) for the self-hosted
 * Auth.js email/password flows. We send them ourselves via Resend (the same client
 * + verified `noreply@selectauto.bg` sender). The link is built from APP_URL.
 */

/** Base URL for links in auth emails. Falls back to the production domain. */
function appUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://selectauto.bg"
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
