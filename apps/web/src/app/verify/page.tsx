import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthMain, VerifyEmailClient } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Потвърждение на имейл | SelectAuto",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string }>;

/** /verify?token=… — confirms a new account's email from the link (boards `ac-verify`, `ac-verify-st`; parity check
 *  docs/design/parity/auth.md). */
export default function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <AuthMain>
        <AuthCard title="Потвърждение на имейл">
          <Suspense
            fallback={
              <div className="ac-wait" role="status">
                <span className="sa-spin" aria-hidden="true" />
                Зареждане…
              </div>
            }
          >
            <VerifyBody searchParams={searchParams} />
          </Suspense>
        </AuthCard>
      </AuthMain>
      <SiteFooter />
    </>
  );
}

async function VerifyBody({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  return <VerifyEmailClient token={token ?? null} />;
}
