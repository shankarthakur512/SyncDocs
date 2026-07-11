import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { handleError, ok } from "@/lib/api/respond";
import { AppError } from "@/lib/rbac/errors";
import { getDocumentByShareToken } from "@/lib/services/documents";

type RouteContext = { params: Promise<{ token: string }> };

/** Same short TTL as member sync tokens — limits blast radius if leaked. */
const TOKEN_TTL = "1h";

/**
 * GET /api/share/[token]/sync-token — PUBLIC (no session required).
 *
 * Mints a short-lived, VIEWER-role JWT for the WebSocket relay so guests see
 * live edits in real time. Safety comes from two independent layers:
 *
 *   1. The claim `role: "VIEWER"` makes the relay set `connection.readOnly` —
 *      the guest's socket can receive updates but any write is dropped
 *      SERVER-side (same enforcement as signed-in viewers).
 *   2. The token is scoped to exactly the shared document (`doc` claim), and
 *      expires quickly; revoking the share link stops new tokens being minted.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;

    // Validate the capability and resolve the document it grants.
    const document = await getDocumentByShareToken(token);

    const secretValue = process.env.SYNC_JWT_SECRET;
    if (!secretValue) {
      throw new AppError(
        "Realtime sync is not configured.",
        500,
        "SYNC_NOT_CONFIGURED",
      );
    }
    const secret = new TextEncoder().encode(secretValue);

    const jwt = await new SignJWT({
      doc: document.id,
      role: "VIEWER", // relay enforces read-only for this role
      name: "Guest",
    })
      // Unique per-connection subject; guests have no user id.
      .setSubject(`guest:${randomUUID()}`)
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(secret);

    return ok({ token: jwt });
  } catch (err) {
    return handleError(err);
  }
}
