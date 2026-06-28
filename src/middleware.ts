import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Edge middleware that enforces authentication on protected routes.
 *
 * It is built from the lightweight, adapter-free `authConfig` so it can run on
 * the Edge runtime. The actual gating logic lives in the `authorized` callback.
 */
export const { auth: middleware } = NextAuth(authConfig);

/**
 * Matcher: run middleware on everything EXCEPT Next.js internals, static
 * assets, and the Auth.js endpoints themselves (which must stay public).
 */
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
