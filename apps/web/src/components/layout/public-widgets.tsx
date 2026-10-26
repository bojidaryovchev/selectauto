"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "./back-to-top";
import { ViberGroupPopup } from "./viber-group-popup";

/**
 * The public site's floating widgets — the Viber-group pill and back-to-top —
 * on every page except the /admin back office, which has its own chrome and
 * where they covered admin controls. Reads usePathname, so the root layout
 * wraps it in a <Suspense> (cacheComponents, routes with a dynamic param).
 */
export function PublicWidgets() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <>
      <ViberGroupPopup />
      <BackToTop />
    </>
  );
}
