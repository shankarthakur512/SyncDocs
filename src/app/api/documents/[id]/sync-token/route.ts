import { SignJWT } from "jose";
import { requireUser } from "@/lib/auth/session";
import { handleError, ok } from "@/lib/api/respond";
import { authorizeDocument } from "@/lib/rbac/authorize";
import { AppError } from "@/lib/rbac/errors";

type RouteContext = { params: Promise<{ id: string }> };

/** Sync access tokens are short-lived to limit the blast radius if leaked. */
const TOKEN_TTL = "1h";

/**
 * GET /api/documents/[id]/sync-token
 *
 * Mints a short-lived JWT the browser hands to the WebSocket relay. The token
 * is scoped to one document and carries the caller's role, so the relay can
 * authorize the connection (and mark viewers read-only) WITHOUT any database
 * access of its own. Requires membership (document:read).
 *
 * The signing secret (SYNC_JWT_SECRET) is shared with the sync-server.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Resolve (and authorize) the caller's role on this document.
    const { role } = await authorizeDocument(user.id, id, "document:read");

    const secretValue = process.env.SYNC_JWT_SECRET;
    if (!secretValue) {
      throw new AppError(
        "Realtime sync is not configured.",
        500,
        "SYNC_NOT_CONFIGURED",
      );
    }
    const secret = new TextEncoder().encode(secretValue);

    const token = await new SignJWT({ doc: id, role, name: user.name ?? null })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(secret);

    return ok({ token });
  } catch (err) {
    return handleError(err);
  }
}
