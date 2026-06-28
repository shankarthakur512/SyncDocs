import { requireUser } from "@/lib/auth/session";
import { handleError, ok } from "@/lib/api/respond";
import { getVersionState } from "@/lib/versioning/service";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

/**
 * GET /api/documents/[id]/versions/[versionId]
 * Returns a version's full encoded state (base64) for preview / time-travel.
 * Requires membership (document:read).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, versionId } = await params;
    const state = await getVersionState(user.id, id, versionId);
    return ok({ state });
  } catch (err) {
    return handleError(err);
  }
}
