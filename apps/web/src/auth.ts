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

        // No user, or an OAuth-only user (no password set) → fail.
        if (!user || !user.passwordHash) return null;

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
});
