import { requireUser } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/respond";
import { updateDocumentSchema } from "@/lib/validation/documents";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "@/lib/services/documents";

/** Next.js 16 passes route params as a Promise. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/documents/[id]
 * Returns the document + collaborators if the caller may view it.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const document = await getDocument(user.id, id);
    return ok({ document });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH /api/documents/[id]
 * Renames the document. Requires OWNER (document:update-meta).
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { title } = await readJson(request, updateDocumentSchema);
    const document = await updateDocument(user.id, id, title);
    return ok({ document });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * DELETE /api/documents/[id]
 * Deletes the document (cascades memberships). Requires OWNER (document:delete).
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteDocument(user.id, id);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
