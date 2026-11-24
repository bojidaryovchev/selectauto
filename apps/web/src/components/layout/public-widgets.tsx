"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "./back-to-top";
import { ViberGroupPopup } from "./viber-group-popup";

/**
 * The public site's floating widgets — the Viber-group pill and back-to-top —
 * on every page except the /admin back office, which has its own chrome and
 * where they covered admin controls. Reads usePathname, so the root layout
 * wraps it in a <Suspense> (cacheComponents, routes with a dynamic param).
 *
 * /zapitvane, the page ads link to, has no Viber invite: it has one job, its
 * quiz, and the invite (which appears on every scroll down) slid over the quiz's
 * step bar and first answers as the card came up after the first answer (owner
 * decision 40; its boards draw no invite).
 */
export function PublicWidgets() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <>
      {pathname === "/zapitvane" ? null : <ViberGroupPopup />}
      <BackToTop />
    </>
  );
}
