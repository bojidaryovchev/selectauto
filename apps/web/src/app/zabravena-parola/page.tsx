import type { Metadata } from "next";
import { Container } from "@/components/common";
import { AuthCard, ForgotPasswordForm } from "@/components/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Забравена парола | SelectAuto",
  robots: { index: false, follow: false },
};

/** /zabravena-parola — request a password-reset link. No request-time data, so
 *  no Suspense needed (the form is a client component). */
export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-[#fafafa] pt-(--header-h)">
        <Container className="flex justify-center py-12 max-md:py-8">
          <AuthCard
            title="Забравена парола"
            subtitle="Въведете имейла си и ще ви изпратим линк за смяна на паролата."
          >
            <ForgotPasswordForm />
          </AuthCard>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
