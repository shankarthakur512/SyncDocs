import { jwtVerify } from "jose";

/**
 * Verifies the short-lived "sync access token" the Next.js app mints for a user
 * on a specific document.
 *
 * The token is a plain HS256 JWT signed with SYNC_JWT_SECRET (shared with the
 * app). It carries the user id, the document id it grants access to, and the
 * user's role. Verifying it here means the relay needs NO database access and
 * NO knowledge of Auth.js internals — it just trusts a signature it can check.
 */

const secret = new TextEncoder().encode(process.env.SYNC_JWT_SECRET ?? "");

export type SyncRole = "OWNER" | "EDITOR" | "VIEWER";

export interface SyncClaims {
  /** User id (JWT subject). */
  sub: string;
  /** The document id this token grants access to. */
  doc: string;
  /** The user's role on that document. */
  role: SyncRole;
  /** Optional display name (for presence). */
  name?: string;
}

/**
 * Validates a token string and returns its claims, or throws if invalid/expired.
 */
export async function verifySyncToken(token?: string): Promise<SyncClaims> {
  if (!token) throw new Error("Missing sync token.");
  if (!process.env.SYNC_JWT_SECRET) {
    throw new Error("Server misconfigured: SYNC_JWT_SECRET is not set.");
  }

  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

  const { sub, doc, role, name } = payload as Record<string, unknown>;
  if (
    typeof sub !== "string" ||
    typeof doc !== "string" ||
    (role !== "OWNER" && role !== "EDITOR" && role !== "VIEWER")
  ) {
    throw new Error("Invalid sync token claims.");
  }

  return { sub, doc, role, name: typeof name === "string" ? name : undefined };
}
