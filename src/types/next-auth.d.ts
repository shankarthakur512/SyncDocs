import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so `session.user.id` and `token.id` are strongly typed
 * across the app (Auth.js does not include a user id on the session by default).
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
    /** The database user id, copied onto the token at sign-in. */
    id?: string;
  }
}
