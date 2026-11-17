/**
 * The colour of a listing status's dot (README, the car card): whether a buyer can act on the car.
 *
 * - `pos`: Наличен — on sale now;
 * - `info`: Предстои, Нов търг — coming up;
 * - `warn`: Очаква одобрение — waiting for the seller;
 * - `null` (grey): every ended or unknown status — Продаден, Непродаден, Неуспешен, Не се продава, Непроверен,
 *   Неизвестен. Red stays for errors.
 *
 * Keyed on the BG labels `statusLabel` (lib/car-labels.ts) returns, which is what a `CarView` carries.
 */
export type StatusTone = "pos" | "info" | "warn" | null;

const TONES: Record<string, StatusTone> = {
  Наличен: "pos",
  Предстои: "info",
  "Нов търг": "info",
  "Очаква одобрение": "warn",
};

export function statusTone(label: string | undefined): StatusTone {
  return (label && TONES[label]) || null;
}
