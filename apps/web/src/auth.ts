import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { signInSchema } from "@/schemas/auth.schema";
import { authConfig } from "@/auth.config";

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
     * Node-side override of the edge `jwt` callback (auth.config.ts). Runs only
     * on the initial sign-in (when `user` is present), where we're in the Node
     * route handler and can hit the DB. Stamps `id` (as before) AND `role` onto
     * the token so the /admin gate can authorise from the JWT alone — no per-
     * request DB read in the proxy. On later requests `user` is undefined, so the
     * existing token (with its role) passes through untouched. The edge config's
     * `jwt` never runs with a `user`, so it never needs the DB.
     */
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const rows = await getDb()
          .select({ role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .limit(1);
        token.role = rows[0]?.role ?? "user";
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
  },
});
