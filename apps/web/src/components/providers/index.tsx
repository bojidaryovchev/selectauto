import type { ReactNode } from "react";
import { InquiryProvider } from "@/contexts/inquiry-context";

/**
 * Composes all client-side context providers mounted once at the root layout.
 * Today that's just the inquiry modal; new providers (e.g. a future toast or
 * theme provider) nest here so `layout.tsx` stays a single `<Providers>` wrap —
 * the same pattern as the ecommerce-store reference app.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <InquiryProvider>{children}</InquiryProvider>;
}
