import { handleError, ok } from "@/lib/api/respond";
import { readStateByShareToken } from "@/lib/versioning/service";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * GET /api/share/[token]/state — PUBLIC (no session required).
 *
 * Returns the document's canonical CRDT state (base64) so a guest can hydrate a
 * read-only editor. Strictly read-only: there is no share-token sync endpoint,
 * so a guest has no path to push changes over HTTP.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const state = await readStateByShareToken(token);
    return ok({ state });
  } catch (err) {
    return handleError(err);
  }
}
