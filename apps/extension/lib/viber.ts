import type { LotCheckResponse } from "./types";

/**
 * Build the ready-to-paste Viber message from a resolved listing. Mirrors the
 * legacy extension's format, but the link is now the real `/avtomobil/{id}`
 * page and the phone comes from the server (single source of truth).
 */
export function buildViberText(res: LotCheckResponse): string {
  const title = res.title || "Автомобил";
  const odometer = res.mileage ? `📍 Пробег: ${res.mileage}` : null;
  const price = res.price ? `💰 Цена: ${res.price}` : null;
  const phone = res.phone || "+359 898 980 011";
  const link = res.url || "";

  return [`🚗 ${title}`, odometer, price, `☎️ Телефон: ${phone}`, "", `🔗 Виж обявата: ${link}`]
    .filter(Boolean)
    .join("\n");
}
