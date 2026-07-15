import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/components/common";
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
 */

export const metadata: Metadata = {
  title: "Страницата не е намерена — SelectAuto",
};

const LINKS = [
  { label: "Всички автомобили", href: "/vsichki-avtomobili" },
  { label: "Внос от Корея", href: "/vnos-na-koli-ot-korea" },
  { label: "Внос от САЩ", href: "/vnos-na-koli-ot-sasht" },
  { label: "Внос от Канада", href: "/vnos-na-koli-ot-kanada" },
  { label: "Калкулатор за внос", href: "/kalkulator" },
  { label: "Контакти", href: "/kontakti" },
];

export default function NotFound() {
  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 bg-[#fafafa] pt-(--header-h) text-ink">
        <Container>
          <div className="flex min-h-[55vh] flex-col items-start justify-center py-16 max-md:py-10">
            <p className="mb-2 text-[13px] font-black uppercase tracking-wider text-brand-dark">
              Грешка 404
            </p>
            <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-ink max-md:text-3xl">
              Страницата не е намерена
            </h1>
            <p className="mb-8 max-w-xl text-[15px] leading-[1.8] text-[#3d4046]">
              Страницата, която търсите, не съществува или е преместена. Разгледайте
              наличните автомобили или започнете от някоя от основните страници.
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-card transition-colors hover:text-brand-dark"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
