import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Admin authorisation helpers for the owner-facing /admin back office.
 *
 * The role lives on the Auth.js JWT (`session.user.role`, minted at sign-in from
 * `users.role` — migration 0029). Everything here reads that session; there is
 * no per-request DB lookup. Defence-in-depth: the proxy already redirects non-
 * admins away from `/admin/**`, but every admin page/query/mutation ALSO calls
 * one of these (the repo gates per-action, not by route alone — see auth.config
 * `authorized`).
 */

/** True when the session belongs to a signed-in admin. */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "admin";
}

/**
 * For admin PAGES (server components): returns the admin session or redirects.
 * A signed-out visitor goes to sign-in (with a return path); a signed-in non-
 * admin goes home (they have no business seeing the back office exists).
 */
export async function requireAdminPage(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }
  return session;
}

/**
 * For admin MUTATIONS/QUERIES (server actions): returns the admin session, or
 * `null` when the caller isn't an admin. The caller returns an `ActionResult`
 * error on null rather than redirecting (an action can't redirect mid-flow).
 */
export async function getAdminSession(): Promise<Session | null> {
  const session = await auth();
  return isAdmin(session) ? session : null;
}
