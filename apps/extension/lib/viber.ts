import type { LotCheckResponse } from "./types";

/**
 * Build the ready-to-paste Viber message. The phone is passed in (the agent's
 * saved/edited number, falling back to the server's default) rather than read
 * from the response, so the operator's own number is used.
 */
export function buildViberText(res: LotCheckResponse, phone: string): string {
  const title = res.title || "Автомобил";
  const odometer = res.mileage ? `📍 Пробег: ${res.mileage}` : null;
  const price = res.price ? `💰 Цена: ${res.price}` : null;
  const tel = phone.trim() || res.phone || "+359 898 980 011";
  const link = res.url || "";

  return [`🚗 ${title}`, odometer, price, `☎️ Телефон: ${tel}`, "", `🔗 Виж обявата: ${link}`]
    .filter(Boolean)
    .join("\n");
}
