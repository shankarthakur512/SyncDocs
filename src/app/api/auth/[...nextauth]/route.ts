import { handlers } from "@/auth";

/**
 * Auth.js route handler. Exposes all authentication endpoints
 * (sign-in, callback, sign-out, session, csrf, ...) under /api/auth/*.
 */
export const { GET, POST } = handlers;
