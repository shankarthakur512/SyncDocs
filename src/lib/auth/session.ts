import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/rbac/errors";

/** The minimal authenticated user shape the app relies on. */
export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/**
 * Returns the current user or `null` if not signed in.
 * Use in places where being signed out is a valid, non-error state.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/**
 * Returns the current user or throws {@link UnauthorizedError} (→ HTTP 401).
 * Use at the top of any handler/action that requires authentication.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
