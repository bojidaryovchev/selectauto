import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CalculatorIcon, FlagCaIcon, FlagKrIcon, FlagUsIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/layout";

/**
 * Global not-found boundary — previously absent, so `notFound()` (invalid car
 * ids, unresolvable make/model hubs, unknown URLs) fell through to Next's
 * default unbranded 404: no header/footer, no links back into the funnel.
 * Next injects `<meta name="robots" content="noindex">` for not-found renders
 * automatically, so no robots metadata is needed here.
 *
 * The header reads `usePathname()` (client) — on an unknown route the pathname
 * is not known at prerender time, so it gets the same Suspense boundary the
 * dynamic-param pages use (see avtomobil/[id]/page.tsx).
 *
 * Look: board `info-404` (parity check docs/design/parity/errors.md): an outlined numeral, the eyebrow, title and
 * lead, and the main pages as chips.
 */

export const metadata: Metadata = {
  title: "Страницата не е намерена — SelectAuto",
};

// A flag inside a chip keeps its 3:2 size; the chip sizes other icons 16 px.
const FLAG = "sa-flag h-3.5 w-5.25";

const LINKS: { label: string; href: string; icon?: ReactNode }[] = [
  { label: "Всички автомобили", href: "/vsichki-avtomobili" },
  { label: "Внос от Корея", href: "/vnos-na-koli-ot-korea", icon: <FlagKrIcon className={FLAG} /> },
  { label: "Внос от САЩ", href: "/vnos-na-koli-ot-sasht", icon: <FlagUsIcon className={FLAG} /> },
  { label: "Внос от Канада", href: "/vnos-na-koli-ot-kanada", icon: <FlagCaIcon className={FLAG} /> },
  { label: "Калкулатор за внос", href: "/kalkulator", icon: <CalculatorIcon /> },
  { label: "Контакти", href: "/kontakti" },
];

export default function NotFound() {
  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 pt-(--header-h)">
        <div className="sa-wrap">
          <div className="flex min-h-130 flex-col items-start justify-center gap-4.5 py-[clamp(64px,9vw,140px)]">
            <span
              aria-hidden="true"
              className="font-display text-[clamp(96px,14vw,220px)] leading-[0.9] font-bold tracking-[-0.04em] text-transparent [-webkit-text-stroke:2px_var(--color-s3)]"
            >
              404
            </span>
            <span className="sa-eyebrow">Грешка 404</span>
            <h1 className="type-h1">Страницата не е намерена</h1>
            <p className="sa-lead">
              Страницата, която търсите, не съществува или е преместена. Разгледайте наличните автомобили или започнете
              от някоя от основните страници.
            </p>
            <nav aria-label="Основни страници" className="mt-2.5 flex flex-wrap gap-2.5">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="sa-chip max-sm:flex-[1_1_calc(50%-10px)] max-sm:justify-center"
                >
                  {l.icon}
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
