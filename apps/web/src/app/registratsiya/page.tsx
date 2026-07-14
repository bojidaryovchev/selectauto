import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common";
import { AuthCard, SignUpForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Регистрация | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ redirectTo?: string }>;

/** /registratsiya — sign up with email/password or Google. */
export default function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-[#fafafa] pt-(--header-h)">
        <Container className="flex justify-center py-12 max-md:py-8">
          <AuthCard title="Регистрация" subtitle="Създайте профил, за да запазвате любими автомобили.">
            <Suspense fallback={<div className="h-80" />}>
              <SignUpFormWithRedirect searchParams={searchParams} />
            </Suspense>
          </AuthCard>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

async function SignUpFormWithRedirect({ searchParams }: { searchParams: SearchParams }) {
  const { redirectTo } = await searchParams;
  const safe = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  return <SignUpForm redirectTo={safe} />;
}
