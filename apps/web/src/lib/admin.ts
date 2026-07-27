import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { AppRole } from "@/constants/admin";

/**
 * Admin authorisation helpers for the owner-facing /admin back office.
 *
 * Roles live on the Auth.js JWT (`session.user.roles`, minted at sign-in from
 * `users.roles` — migrations 0029→0031). Everything here reads that session;
 * there is no per-request DB lookup. Defence-in-depth: the proxy already
 * redirects non-admins away from `/admin/**`, but every admin page/query/mutation
 * ALSO calls one of these (the repo gates per-action, not by route alone — see
 * auth.config `authorized`).
 */

/** True when the session holds the given elevated role. */
export function hasRole(session: Session | null, role: AppRole): boolean {
  return session?.user?.roles?.includes(role) ?? false;
}

/** True when the session belongs to a signed-in admin. */
export function isAdmin(session: Session | null): boolean {
  return hasRole(session, "admin");
}

/**
 * True for „Наблюдаващ" (observer) — the accountant-style role that may create
 * and follow contracts but never edit them. An admin is NOT implicitly an
 * observer; use `canUseBackOffice` for "may see the back office at all".
 */
export function isObserver(session: Session | null): boolean {
  return hasRole(session, "observer");
}

/** True when the session may enter /admin at all (either elevated role). */
export function canUseBackOffice(session: Session | null): boolean {
  return isAdmin(session) || isObserver(session);
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
  if (!isAdmin(session)) {
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

/**
 * For BACK-OFFICE pages an observer may also see (contracts, deposits): returns
 * the session or redirects, exactly like `requireAdminPage`.
 */
export async function requireBackOfficePage(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/admin");
  }
  if (!canUseBackOffice(session)) {
    redirect("/");
  }
  return session;
}

/**
 * For QUERIES/ACTIONS an observer may also perform (reads, and creating a
 * contract/deposit): the session, or `null` when the caller holds neither
 * elevated role. Anything that EDITS existing data must keep using
 * `getAdminSession` instead — that split is the whole point of the role.
 */
export async function getBackOfficeSession(): Promise<Session | null> {
  const session = await auth();
  return canUseBackOffice(session) ? session : null;
}
