import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthErrorContent, AuthErrorSkeleton, AuthMain } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Грешка при вход | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ error?: string }>;

/**
 * /greshka-pri-vhod — branded Auth.js error page (wired via `pages.error` in
 * auth.config.ts), replacing the raw `/api/auth/error` card (boards `ac-autherr`, `ac-autherr-st`; parity check
 * docs/design/parity/auth.md). Static shell; the body reads `error` from searchParams (request-time data) inside
 * <Suspense>, as required under cacheComponents, a skeleton card until then.
 */
export default function AuthErrorPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <AuthMain>
        <Suspense fallback={<AuthErrorSkeleton />}>
          <AuthErrorBody searchParams={searchParams} />
        </Suspense>
      </AuthMain>
      <SiteFooter />
    </>
  );
}

async function AuthErrorBody({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return <AuthErrorContent error={error} />;
}
