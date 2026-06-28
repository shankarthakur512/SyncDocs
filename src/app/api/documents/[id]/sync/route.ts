import { requireUser } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/respond";
import { syncSchema, MAX_SYNC_BODY_BYTES } from "@/lib/versioning/validation";
import { syncDocument } from "@/lib/versioning/service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/documents/[id]/sync
 *
 * The reconciliation endpoint: accepts the client's local Yjs update (its
 * offline edits) plus an optional state vector, merges it into the server's
 * canonical state, and returns the minimal delta the client is missing.
 * Requires `document:write` — VIEWERs cannot push state (RBAC).
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    // Larger body cap: sync payloads can include embedded images.
    const { update, stateVector } = await readJson(
      request,
      syncSchema,
      MAX_SYNC_BODY_BYTES,
    );
    const result = await syncDocument(user.id, id, update, stateVector);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
