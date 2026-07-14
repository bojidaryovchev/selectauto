import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/components/common";
import { AuthCard, ResetPasswordForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Нова парола | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string }>;

/** /nova-parola?token=… — set a new password from the emailed reset link. */
export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-[#fafafa] pt-(--header-h)">
        <Container className="flex justify-center py-12 max-md:py-8">
          <AuthCard title="Нова парола" subtitle="Задайте нова парола за профила си.">
            <Suspense fallback={<div className="h-48" />}>
              <ResetBody searchParams={searchParams} />
            </Suspense>
          </AuthCard>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

async function ResetBody({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">Липсва или невалиден линк за смяна на парола.</p>
        <Link href="/zabravena-parola" className="text-sm font-bold text-brand-dark hover:underline">
          Поискай нов линк
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
