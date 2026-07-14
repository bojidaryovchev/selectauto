import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { AuthCard, VerifyEmailClient } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Потвърждение на имейл | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string }>;

/** /verify?token=… — confirms a new account's email from the link. */
export default function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-[#fafafa] pt-(--header-h)">
        <Container className="flex justify-center py-12 max-md:py-8">
          <AuthCard title="Потвърждение на имейл">
            <Suspense fallback={<p className="text-sm text-muted">Зареждане…</p>}>
              <VerifyBody searchParams={searchParams} />
            </Suspense>
          </AuthCard>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

async function VerifyBody({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  return <VerifyEmailClient token={token ?? null} />;
}
