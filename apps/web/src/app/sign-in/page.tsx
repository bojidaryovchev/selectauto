import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { AuthCard, SignInForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Вход | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ redirectTo?: string }>;

/**
 * /sign-in — email/password + Google sign-in. Static shell; the form (which reads
 * `redirectTo` from searchParams, request-time data) streams inside <Suspense> as
 * required under cacheComponents.
 */
export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-[#fafafa] pt-(--header-h)">
        <Container className="flex justify-center py-12 max-md:py-8">
          <AuthCard title="Вход" subtitle="Влезте в профила си, за да управлявате любимите си автомобили.">
            <Suspense fallback={<div className="h-72" />}>
              <SignInFormWithRedirect searchParams={searchParams} />
            </Suspense>
          </AuthCard>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

async function SignInFormWithRedirect({ searchParams }: { searchParams: SearchParams }) {
  const { redirectTo } = await searchParams;
  return <SignInForm redirectTo={sanitizeRedirect(redirectTo)} />;
}

/** Only allow same-site relative redirects (no open-redirect to other hosts). */
function sanitizeRedirect(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}
