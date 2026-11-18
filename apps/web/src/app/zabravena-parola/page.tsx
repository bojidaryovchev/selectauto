import type { Metadata } from "next";
import { AuthCard, AuthMain, ForgotPasswordForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Забравена парола | SelectAuto",
  robots: { index: false, follow: false },
};

/** /zabravena-parola — request a password-reset link (boards `ac-forgot`, `ac-forgot-st`; parity check
 *  docs/design/parity/auth.md). No request-time data, so no Suspense needed (the form is a client component). */
export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AuthMain>
        <AuthCard title="Забравена парола" subtitle="Въведете имейла си и ще ви изпратим линк за смяна на паролата.">
          <ForgotPasswordForm />
        </AuthCard>
      </AuthMain>
      <SiteFooter />
    </>
  );
}
