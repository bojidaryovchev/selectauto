import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthFormSkeleton, AuthMain, SignUpForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Регистрация | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ redirectTo?: string }>;

/** /registratsiya — sign up with email/password or Google (boards `ac-register`, `ac-register-st`; parity check
 *  docs/design/parity/auth.md). */
export default function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <AuthMain>
        <AuthCard title="Регистрация" subtitle="Създайте профил, за да запазвате любими автомобили.">
          <Suspense fallback={<AuthFormSkeleton google fields={4} />}>
            <SignUpFormWithRedirect searchParams={searchParams} />
          </Suspense>
        </AuthCard>
      </AuthMain>
      <SiteFooter />
    </>
  );
}

async function SignUpFormWithRedirect({ searchParams }: { searchParams: SearchParams }) {
  const { redirectTo } = await searchParams;
  const safe = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  return <SignUpForm redirectTo={safe} />;
}
