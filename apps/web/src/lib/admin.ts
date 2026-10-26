import { eq, type Column, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { rolesGrant, type AppRole, type Capability } from "@/constants/admin";

/**
 * Authorisation helpers for the owner-facing /admin back office.
 *
 * Roles live on the Auth.js JWT (`session.user.roles`, minted at sign-in from
 * `users.roles` — migrations 0029→0031 — and re-read at most a minute later for
 * tokens that carry a role, see auth.ts). Everything here reads that session.
 * Defence-in-depth: the proxy already
 * redirects anyone without back-office access away from `/admin/**`, but every
 * page/query/mutation ALSO calls one of these (the repo gates per-action, not
 * by route alone — see auth.config `authorized`).
 *
 * Two kinds of gate:
 *  - CAPABILITIES (`can`, `requirePageWith`, `getSessionWith`) for the contract,
 *    deposit and mobile.bg back office — what each role carries is defined once,
 *    in `ROLE_CAPABILITIES` (constants/admin.ts);
 *  - the ADMIN ROLE (`requireAdminPage`, `getAdminSession`) for the sections only
 *    an admin works in: leads, mail, tariffs, recipients, users, de-indexing, the
 *    audit log.
 */

/** True when the session holds the given elevated role. */
export function hasRole(session: Session | null, role: AppRole): boolean {
  return session?.user?.roles?.includes(role) ?? false;
}

/** True when the session belongs to a signed-in admin. */
export function isAdmin(session: Session | null): boolean {
  return hasRole(session, "admin");
}

/** True when any of the session's roles carries the capability. */
export function can(session: Session | null, capability: Capability): boolean {
  return rolesGrant(session?.user?.roles, capability);
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
 * For back-office PAGES gated on a capability: returns the session or
 * redirects, exactly like `requireAdminPage`.
 */
export async function requirePageWith(capability: Capability): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/admin");
  }
  if (!can(session, capability)) {
    redirect("/");
  }
  return session;
}

/**
 * For back-office QUERIES/ACTIONS gated on a capability: the session, or `null`
 * when the caller lacks it.
 */
export async function getSessionWith(capability: Capability): Promise<Session | null> {
  const session = await auth();
  return can(session, capability) ? session : null;
}

/**
 * Whether the session may see one contract or deposit (and everything hanging
 * off it — documents, notices, payment proofs). With `contracts.viewAll`: any.
 * Without: only the ones the user created („each agent follows their own
 * deals", owner spec 07.2026). Callers answer "not found" on false, so a URL
 * never reveals that someone else's record exists.
 */
export function canSeeRecord(session: Session | null, createdBy: string | null | undefined): boolean {
  if (can(session, "contracts.viewAll")) return true;
  return Boolean(createdBy) && createdBy === session?.user?.id;
}

/**
 * The same rule as `canSeeRecord`, as a WHERE condition on a `created_by`
 * column for list queries: `undefined` (no filter) with `contracts.viewAll`.
 */
export function visibleRecords(session: Session | null, createdBy: Column): SQL | undefined {
  return can(session, "contracts.viewAll") ? undefined : eq(createdBy, session?.user?.id ?? "");
}
