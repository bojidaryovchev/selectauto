import Image from "next/image";

/**
 * The logo's sizes on the design canvas (Brand board „Основи: лого, цветове,
 * шрифтове"): the desktop header 48 px tall, the phone and tablet top bar
 * 36 px, the footer 72 px. Below 32 px the lettering can't be read, so there
 * is no smaller size. Widths keep the file's 2560×1555 ratio, rounded.
 */
const SIZES = {
  bar: { width: 59, height: 36 },
  header: { width: 79, height: 48 },
  footer: { width: 119, height: 72 },
} as const;

/**
 * The SelectAuto logo, kept exactly as it was (owner decision 2). It only ever
 * sits on a dark ground (`bg` or a surface): its gold reads 11.6:1 on `bg` but
 * 2.0:1 on orange, so never put it on `or` or on a light ground.
 *
 * `width`/`height` are the rendered box, so next/image picks a srcset that fits
 * the slot. Prefer `fetchPriority="high"` to a preload for a logo in a bar that
 * is hidden at some widths: a preload is fetched even where the bar is hidden.
 */
export function Logo({
  size,
  fetchPriority,
  className = "",
}: {
  size: keyof typeof SIZES;
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
}) {
  const { width, height } = SIZES[size];
  return (
    <Image
      src="/logo.png"
      alt="SelectAuto"
      width={width}
      height={height}
      fetchPriority={fetchPriority}
      className={className}
    />
  );
}
