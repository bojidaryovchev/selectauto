import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { signInSchema } from "@/schemas/auth.schema";
import { authConfig } from "@/auth.config";

/**
 * Roles re-read for staff tokens, per server instance. Auth.js re-signs the
 * session cookie on every visit, so a token minted at sign-in can live for as
 * long as its holder keeps coming back — roles read only at sign-in would make
 * taking a role away a no-op. A minute keeps that to one primary-key read per
 * staff member per instance, and only tokens that already carry a role pay it.
 */
const ROLES_TTL_MS = 60_000;
const rolesCache = new Map<string, { roles: string[]; at: number }>();

async function readRoles(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ roles: schema.users.roles })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0]?.roles ?? [];
}

/** The user's current roles, cached for ROLES_TTL_MS; keeps `fallback` if the DB can't be read. */
async function currentRoles(userId: string, fallback: string[]): Promise<string[]> {
  const hit = rolesCache.get(userId);
  if (hit && Date.now() - hit.at < ROLES_TTL_MS) return hit.roles;
  try {
    const roles = await readRoles(userId);
    rolesCache.set(userId, { roles, at: Date.now() });
    return roles;
  } catch (error) {
    console.error("[auth] roles re-read failed; keeping the token's roles", error);
    return fallback;
  }
}

/** Drops a user's cached roles, so a change made on this instance applies at once. */
export function forgetCachedRoles(userId: string): void {
  rolesCache.delete(userId);
}

/**
 * Full Auth.js (NextAuth v5) instance — server/Node side. Spreads the edge-safe
 * `authConfig` (Google + JWT + callbacks) and adds the parts that need Node:
 *  - the Drizzle adapter (DB persistence of users/accounts/verification tokens),
 *  - the Credentials (email/password) provider, which uses bcrypt + a DB lookup.
 *
 * This file is imported by Server Components, Server Actions, and the route
 * handler — NOT by the proxy (which imports only authConfig, to stay edge-safe).
 *
 * Exports `auth` (read the session server-side), `signIn`/`signOut` (server-side
 * auth actions), and `handlers` (the [...nextauth] route).
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Node-side override of the edge `jwt` callback (auth.config.ts). On the
     * initial sign-in (when `user` is present) it stamps `id` AND `roles` onto
     * the token. On later requests a token that carries roles re-reads them
     * (`currentRoles`, ≤ 1 min old), so a role taken away in /admin/potrebiteli
     * stops working within a minute for every page and action, which all read
     * the session through this config. The proxy runs the DB-free edge config
     * and keeps the cookie's roles until the cookie is re-signed here — fine,
     * because every back-office page and action re-checks. A role GRANTED to an
     * account that had none still waits for its next sign-in: role-less tokens
     * skip the read so public sessions cost nothing.
     *
     * Also stamps `provider` — which method just signed the user in — so the
     * client can mark it as "last used" on /sign-in even though the Google flow
     * redirects the page away mid-sign-in. See remember-auth-method.tsx.
     */
    async jwt({ token, user, account }) {
      // `account` is present ONLY on the initial sign-in, for both flows: the
      // OAuth branch forwards the provider's account and the credentials branch
      // synthesizes `{ provider: "credentials", type: "credentials" }` before
      // invoking this callback (@auth/core lib/actions/callback/index.js). On
      // later requests it's undefined and the existing claim passes through.
      if (account?.provider) {
        token.provider = account.provider;
      }
      if (user?.id) {
        const roles = await readRoles(user.id);
        token.id = user.id;
        token.roles = roles;
        rolesCache.set(user.id, { roles, at: Date.now() });
        return token;
      }
      const id = typeof token.id === "string" ? token.id : null;
      const roles = Array.isArray(token.roles) ? (token.roles as string[]) : [];
      if (id && roles.length > 0) {
        token.roles = await currentRoles(id, roles);
      }
      return token;
    },
  },
  adapter: DrizzleAdapter(getDb(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    verificationTokensTable: schema.verificationTokens,
    // No sessionsTable — JWT sessions don't use one.
  }),
  providers: [
    // Keep Google from the shared config…
    ...authConfig.providers,
    // …and add Credentials (Node-only: bcrypt + DB).
    Credentials({
      credentials: {
        email: { label: "Имейл", type: "email" },
        password: { label: "Парола", type: "password" },
      },
      /**
       * Validates the email/password pair. Returns the user object on success or
       * `null`/throws on failure (Auth.js treats both as "login failed", surfaced
       * to the client as a generic CredentialsSignin error — we never leak which
       * part was wrong). Blocks accounts whose email isn't verified yet.
       */
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const db = getDb();
        const rows = await db
          .select()
          .from(schema.users)
          // case-insensitive match (the unique index is on lower(email))
          .where(eq(sql`lower(${schema.users.email})`, email.toLowerCase()))
          .limit(1);
        const user = rows[0];

        // No such email → generic failure (return null → "wrong email or password").
        if (!user) return null;

        // The email belongs to a Google-only account (signed up via OAuth, no password
        // set): steer them to the Google button instead of failing generically. NB: this
        // reveals the account exists as a Google account — an intentional UX/enumeration
        // tradeoff, consistent with the EMAIL_NOT_VERIFIED branch below.
        if (!user.passwordHash) {
          throw new Error("OAUTH_ONLY");
        }

        // Require a verified email before allowing password sign-in.
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    /**
     * Defense-in-depth for `allowDangerousEmailAccountLinking` (auth.config.ts).
     *
     * When a Google account is linked to an existing user, that user may be a
     * password account whose email was NEVER verified through our own flow
     * (`verifyEmail` sets `emailVerified`). Such a password is untrusted — it could
     * have been set by someone who doesn't control the inbox — and must never become
     * usable. @auth/core already leaves `emailVerified` untouched on OAuth linking
     * (handle-login.js), and `authorize` gates password sign-in on `emailVerified`,
     * so the password stays dormant. This makes that invariant explicit and
     * refactor-proof: if the linked user is still unverified, wipe the password hash.
     * A genuinely verified user (real dual login) has `emailVerified` set → password
     * is preserved. `linkAccount` fires only on the FIRST link (subsequent Google
     * sign-ins match by account id and skip it), so this never touches an
     * already-established account.
     */
    async linkAccount({ user }) {
      if (!user.id) return;
      const db = getDb();
      const rows = await db
        .select({
          emailVerified: schema.users.emailVerified,
          passwordHash: schema.users.passwordHash,
        })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1);
      const row = rows[0];
      if (row && !row.emailVerified && row.passwordHash) {
        await db
          .update(schema.users)
          .set({ passwordHash: null })
          .where(eq(schema.users.id, user.id));
      }
    },
    /**
     * Stamp `email_verified` for Google sign-ins. @auth/core creates every OAuth
     * user with `emailVerified: null` — hardcoded in
     * lib/actions/callback/handle-login.js as `createUser({ ...profile,
     * emailVerified: null })` — so Google's verified-email signal never reaches
     * the users row. Without this, no Google user ever satisfies the
     * `email_verified IS NOT NULL` gate the favourite-auction digest (and any
     * future verified-email check) relies on, and the digest silently never sends
     * to them. Google verifies email ownership — the same trust
     * `allowDangerousEmailAccountLinking` (auth.config.ts) is built on — so we
     * stamp it ourselves. The `isNull` guard makes this a one-time write per user
     * and never clobbers an existing verification timestamp. `signIn` fires AFTER
     * the `linkAccount` event above, so the unverified-password defence still runs
     * first when a Google account links to a pre-existing password user.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user?.id) return;
      await getDb()
        .update(schema.users)
        .set({ emailVerified: new Date() })
        .where(and(eq(schema.users.id, user.id), isNull(schema.users.emailVerified)));
    },
  },
});
