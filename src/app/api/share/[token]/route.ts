import { handleError, ok } from "@/lib/api/respond";
import { getDocumentByShareToken } from "@/lib/services/documents";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * GET /api/share/[token] — PUBLIC (no session required).
 *
 * Resolves a share-link token to the document's public metadata so the guest
 * page can render a title and know which document id to open. The token is the
 * authorization: unknown/revoked tokens 404 without leaking anything.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const document = await getDocumentByShareToken(token);
    return ok({ document });
  } catch (err) {
    return handleError(err);
  }
}
