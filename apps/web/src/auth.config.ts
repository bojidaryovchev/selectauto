import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js config — the part that runs in the middleware/proxy (edge
 * runtime). It must NOT import the DB adapter, bcrypt, or anything Node-only,
 * because the proxy runs on the edge where TCP sockets / native deps don't exist.
 * The full config (auth.ts) spreads this and adds the Drizzle adapter + the
 * Credentials provider (which needs bcrypt + DB). See Auth.js "edge compatibility".
 *
 * Google is declared here (it's edge-safe — pure OAuth redirect, no DB at config
 * time). The Credentials provider is added in auth.ts only. `AUTH_GOOGLE_ID` /
 * `AUTH_GOOGLE_SECRET` are read from the env automatically by the provider.
 */
export const authConfig = {
  // JWT sessions: stateless signed cookie, no DB read per request — the right fit
  // for Neon-serverless + cacheComponents (no sessions table, see migration 0019).
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [Google],
  callbacks: {
    /**
     * Persist the user id onto the JWT at sign-in, so the session can expose it
     * without a DB read. `user` is only present on the initial sign-in; afterwards
     * we read from the existing token.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    /**
     * Expose the user id on `session.user.id` so server code (favourites) and the
     * client (`useSession`) can read it. The type augmentation lives in
     * `src/types/next-auth.d.ts`.
     */
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    /**
     * `authorized` runs in the proxy/middleware for every matched request. We
     * return true unconditionally: the catalog, homepage, and detail pages are
     * public, and the favourites feature is gated PER-ACTION (the server actions
     * call `auth()` and reject when there's no user) rather than by route. This
     * keeps the middleware from redirecting public traffic.
     */
    authorized() {
      return true;
    },
  },
} satisfies NextAuthConfig;
