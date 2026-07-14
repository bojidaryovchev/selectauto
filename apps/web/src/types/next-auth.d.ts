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
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
