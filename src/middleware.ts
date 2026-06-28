import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Edge middleware that enforces authentication on protected routes.
 *
 * Built from the lightweight, adapter-free `authConfig` so it can run on the
 * Edge runtime. The gating logic lives in the `authorized` callback.
 *
 * NOTE: Next.js 16's build statically scans this file for a function export and
 * does NOT recognise a destructured `export const { auth: middleware }`. We
 * therefore assign to a plain identifier and `export default` it, which the
 * build detects reliably.
 */
const { auth } = NextAuth(authConfig);

export default auth;

/**
 * Matcher: run middleware on everything EXCEPT Next.js internals, static
 * assets, and the Auth.js endpoints themselves (which must stay public).
 */
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
