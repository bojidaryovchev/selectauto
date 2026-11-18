import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthFormSkeleton, AuthMain, SignInForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Вход | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ redirectTo?: string }>;

/**
 * /sign-in — email/password + Google sign-in (boards `ac-signin`, `ac-signin-st`; parity check
 * docs/design/parity/auth.md). Static shell; the form (which reads `redirectTo` from searchParams, request-time data)
 * streams inside <Suspense> as required under cacheComponents, a skeleton until then.
 */
export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <AuthMain>
        <AuthCard title="Вход" subtitle="Влезте в профила си, за да управлявате любимите си автомобили.">
          <Suspense fallback={<AuthFormSkeleton google fields={2} />}>
            <SignInFormWithRedirect searchParams={searchParams} />
          </Suspense>
        </AuthCard>
      </AuthMain>
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
