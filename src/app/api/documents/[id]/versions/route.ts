import { requireUser } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/respond";
import { saveVersionSchema } from "@/lib/versioning/validation";
import { listVersions, saveVersion } from "@/lib/versioning/service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/documents/[id]/versions
 * Lists version history metadata. Requires membership (document:read).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const versions = await listVersions(user.id, id);
    return ok({ versions });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/documents/[id]/versions
 * Captures a snapshot of the current state. Requires document:write.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { label, kind } = await readJson(request, saveVersionSchema);
    // `kind` defaults to MANUAL; apply the fallback explicitly for strict typing.
    const version = await saveVersion(user.id, id, label, kind ?? "MANUAL");
    return ok({ version }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
