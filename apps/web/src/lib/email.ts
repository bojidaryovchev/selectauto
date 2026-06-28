import { Resend } from "resend";

/**
 * Resend client + Carfax notification email. Mirrors the old WordPress
 * handler's `wp_mail` to info@selectauto.bg: a plain-text summary of the
 * submission, subject "Ново Carfax запитване - {name}".
 *
 * Sending is best-effort at the call site — the API route logs failures but does
 * not fail the submission on an email error.
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
    text: lines.join("\n"),
  });
}
