import type { DefaultSession } from "next-auth";

/**
 * Module augmentation: add our custom fields to the Auth.js Session and JWT.
 * `session.user.id` is populated by the `session` callback in auth.config.ts from
 * the JWT, so server code (favourites queries/mutations) and `useSession` on the
 * client can read the current user's id.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Elevated roles (e.g. 'admin') — authorises the /admin back office. */
      roles: string[];
      /**
       * Auth.js provider id of the method that signed this session in — "google"
       * or "credentials". Undefined on sessions issued before the claim existed.
       * Read by the client to mark the last-used method on /sign-in.
       */
      authProvider?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /** Elevated roles — minted at sign-in by the jwt callback in auth.ts. */
    roles?: string[];
    /** Provider id of the sign-in that minted this token (auth.ts jwt callback). */
    provider?: string;
  }
}
