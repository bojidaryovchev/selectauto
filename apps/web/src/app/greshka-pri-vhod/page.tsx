import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { AuthErrorContent } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Грешка при вход | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ error?: string }>;

/**
 * /greshka-pri-vhod — branded Auth.js error page (wired via `pages.error` in
 * auth.config.ts), replacing the raw `/api/auth/error` card. Static shell; the
 * body reads `error` from searchParams (request-time data) inside <Suspense>, as
 * required under cacheComponents.
 */
export default function AuthErrorPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-[#fafafa] pt-(--header-h)">
        <Container className="flex justify-center py-12 max-md:py-8">
          <Suspense fallback={<div className="h-96 w-full max-w-110" />}>
            <AuthErrorBody searchParams={searchParams} />
          </Suspense>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

async function AuthErrorBody({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return <AuthErrorContent error={error} />;
}
