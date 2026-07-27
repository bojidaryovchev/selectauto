import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { isLongDeadArchivedLot, parseAvtomobilId } from "@/lib/sold-lot-gone";

/**
 * Proxy (Next 16's renamed `middleware`). Three responsibilities, in order:
 *
 * 1. **410 Gone for long-dead sold lots.** A `/avtomobil/{id}` whose lot was
 *    archived ≥ `SOLD_LOT_410_AFTER` ago returns 410 — the crawl-budget-cheaper
 *    de-index signal the PPR page can't emit itself (a page.tsx streams a 200
 *    shell; see docs/11-web-seo-and-indexing.md §3). Just-sold lots fall through to
 *    the page's own `noindex, follow`.
 * 2. **Admin gate.** `/admin/**` is the one force-protected area (roles ride on
 *    the Auth.js JWT); signed-out → sign-in, signed-in non-admin → home.
 * 3. **Auth.js session.** Everything else delegates to NextAuth (Google + JWT),
 *    using ONLY the `authConfig` instance (no Drizzle adapter / bcrypt). No public
 *    routes are force-protected — favourites are gated per-action — so this just
 *    refreshes/propagates the session.
 *
 * Runtime note: Next 16 runs proxy on the **Node.js runtime** (edge is not
 * supported and can't be configured — version-16 upgrade guide), so the 410 check's
 * DB lookup is safe here. The historical "edge-safe" split of `authConfig` from
 * `auth.ts` is still correct for keeping the proxy bundle light, but no longer
 * implies "no DB".
 *
 * NextAuth's `auth(handler)` runs `handler(req)` with the session attached: return
 * a `Response` to short-circuit (our 410) or `undefined`/`NextResponse.next()`
 * to continue with the default session refresh.
 */
const { auth } = NextAuth(authConfig);

/** Shared 410 response (body-less, explicit noindex belt-and-braces). */
function gone(): NextResponse {
  return new NextResponse(null, { status: 410, headers: { "x-robots-tag": "noindex" } });
}

export const proxy = auth(async (request) => {
  // 1. Long-dead sold lots → 410.
  const id = parseAvtomobilId(request.nextUrl.pathname);
  if (id !== null && (await isLongDeadArchivedLot(id))) {
    return gone();
  }

  // 2. Admin back office (/admin/**) — the ONE force-protected area. Roles ride
  //    on the Auth.js JWT (session.user.roles, minted at sign-in), so this reads
  //    `request.auth` with no DB lookup. Signed-out → sign-in (with a return
  //    path); signed-in without the 'admin' role → home (don't advertise the back
  //    office exists). Every admin page/action re-checks via lib/admin (defence-
  //    in-depth).
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!request.auth?.user) {
      const signIn = new URL("/sign-in", request.nextUrl);
      signIn.searchParams.set("redirectTo", "/admin");
      return NextResponse.redirect(signIn);
    }
    // Either elevated role may enter; what each may DO is enforced per page and
    // per action (lib/admin: requireAdminPage vs requireBackOfficePage).
    const roles = request.auth.user.roles ?? [];
    if (!roles.includes("admin") && !roles.includes("observer")) {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
  }

  // 3. Not a long-dead lot, allowed → continue (session refresh).
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
