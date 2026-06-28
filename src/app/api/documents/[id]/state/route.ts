import { requireUser } from "@/lib/auth/session";
import { handleError, ok } from "@/lib/api/respond";
import { readCanonicalState } from "@/lib/versioning/service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/documents/[id]/state
 * Read-only hydration of the canonical CRDT state (base64). Requires membership
 * (document:read), so viewers can load content without write access.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const state = await readCanonicalState(user.id, id);
    return ok({ state });
  } catch (err) {
    return handleError(err);
  }
}
