import { requireUser } from "@/lib/auth/session";
import { handleError, ok } from "@/lib/api/respond";
import { restoreVersion } from "@/lib/versioning/service";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

/**
 * POST /api/documents/[id]/versions/[versionId]/restore
 * Restores the document to a previous version (non-destructive: the current
 * state is auto-snapshotted first). Requires document:write.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, versionId } = await params;
    const result = await restoreVersion(user.id, id, versionId);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
