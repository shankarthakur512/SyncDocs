import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration.
 *
 * Next.js middleware runs on the Edge runtime, where the Prisma adapter (which
 * needs Node APIs / TCP) cannot run. We therefore keep the adapter OUT of this
 * file and import only this lightweight config into `middleware.ts`. The full
 * config in `auth.ts` (Node runtime) spreads this and adds the Prisma adapter.
 *
 * The `jwt`/`session` callbacks live here (not the adapter) so the token shape
 * is consistent in both runtimes.
 */
export const authConfig = {
  // JWT sessions: stateless, edge-readable, and forwardable to the realtime server.
  session: { strategy: "jwt" },

  // Custom sign-in screen.
  pages: { signIn: "/signin" },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  ],

  callbacks: {
    /**
     * Checks if the user is authorized to access the requested page.
     * 
     */
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isProtected =
        pathname.startsWith("/doc") ||
        pathname.startsWith("/api/documents");

      if (isProtected) return isLoggedIn; // redirected to signIn page if false
      return true;
    },

    /** Copy the DB user id onto the token at sign-in so it persists in the JWT. */
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },

    /** Expose the user id on the session consumed by the app. */
    session({ session, token }) {
      // `token.id` is set at sign-in; `token.sub` is Auth.js's default subject.
      const userId = token.id ?? token.sub;
      if (session.user && typeof userId === "string") {
        session.user.id = userId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
