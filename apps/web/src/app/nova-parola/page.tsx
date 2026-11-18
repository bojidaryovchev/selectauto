import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthAlert, AuthCard, AuthFormSkeleton, AuthMain, ResetPasswordForm } from "@/components/auth";
import { LinkButton } from "@/components/common";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Нова парола | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string }>;

/** /nova-parola?token=… — set a new password from the emailed reset link (boards `ac-reset`, `ac-reset-st`; parity
 *  check docs/design/parity/auth.md). */
export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <AuthMain>
        <AuthCard title="Нова парола" subtitle="Задайте нова парола за профила си.">
          <Suspense fallback={<AuthFormSkeleton fields={2} />}>
            <ResetBody searchParams={searchParams} />
          </Suspense>
        </AuthCard>
      </AuthMain>
      <SiteFooter />
    </>
  );
}

async function ResetBody({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="ac-acts">
        <AuthAlert tone="warn">Липсва или невалиден линк за смяна на парола.</AuthAlert>
        <LinkButton href="/zabravena-parola" variant="pri" block>
          Поискайте нов линк
        </LinkButton>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
