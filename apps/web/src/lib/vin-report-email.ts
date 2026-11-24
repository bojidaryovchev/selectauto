/**
 * The e-mail that sends a bought Carfax / AutoCheck report to the client of a Carfax lead (the lead drawer's
 * „Изпратете на клиента", and the VIN desk after a purchase for a lead): its subject, the PDF's file name and the
 * default text staff start from. Pure and import-free — `tests/vin-report-email.test.mts` loads it as it is — so the
 * caller passes the business's phone (`CONTACT.phone`).
 *
 * It goes out like a reply from /admin/poshta (mutations/vin-reports/send-report-to-client.mutation.ts): plain text, as
 * info@selectauto.bg, filed as a conversation there. The subject is also what files the client's answer into that
 * conversation (lib/inbound-mail.ts threads by sender and subject), so it stays fixed: staff edit only the text.
 * Formal address, capitalised („Ви") as in every e-mail to one named person.
 */

export function vinReportEmailSubject(providerLabel: string, vin: string): string {
  return `Отчет ${providerLabel} за VIN ${vin} — SelectAuto`;
}

/** „Carfax-1HGCM82633A004352.pdf": the provider and the VIN, which say what the file is once it is saved. */
export function vinReportPdfFilename(providerLabel: string, vin: string): string {
  return `${providerLabel}-${vin}.pdf`;
}

export function defaultVinReportEmailBody(options: {
  name: string | null;
  providerLabel: string;
  vin: string;
  /** AuctionsAPI's vehicle name („HONDA CR-V EX 2018") or the lead's make and model; left out when unknown. */
  vehicle: string | null;
  phone: string;
}): string {
  const name = options.name?.trim();
  const vehicle = options.vehicle?.trim();
  return [
    name ? `Здравейте, ${name}!` : "Здравейте!",
    "",
    `Изпращаме Ви отчета ${options.providerLabel} за автомобила с VIN ${options.vin}${vehicle ? ` (${vehicle})` : ""}. ` +
      "Отчетът е в прикачения PDF файл.",
    "",
    "Ако имате въпроси по отчета или искате да обсъдим автомобила, отговорете на този имейл или се обадете на " +
      `${options.phone}.`,
    "",
    "Поздрави,",
    "Екипът на SelectAuto",
  ].join("\n");
}

/**
 * The address a lead typed, as the mail inbox keys a conversation (bare, lower-cased), or null when it can't be one.
 * Deliberately loose — the visitor's own address, already accepted by the /carfax form — but never something Resend
 * would refuse or that could carry a second recipient (a comma, a space, angle brackets).
 */
export function leadEmailAddress(raw: string | null | undefined): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email) && email.length <= 254 ? email : null;
}

/** The longest text the dialog sends; Поща's replies allow 50 000, a report's cover note needs far less. */
export const VIN_REPORT_EMAIL_MAX_LENGTH = 20_000;
