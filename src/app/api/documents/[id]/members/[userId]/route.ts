import { requireUser } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/respond";
import { updateMemberSchema } from "@/lib/validation/documents";
import { removeMember, updateMemberRole } from "@/lib/services/documents";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

/**
 * PATCH /api/documents/[id]/members/[userId]
 * Changes a collaborator's role. Requires OWNER (members:manage).
 * The service enforces the "≥1 owner" invariant.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, userId } = await params;
    const { role } = await readJson(request, updateMemberSchema);
    const membership = await updateMemberRole(user.id, id, userId, role);
    return ok({ membership });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * DELETE /api/documents/[id]/members/[userId]
 * Removes a collaborator. Requires OWNER (members:manage).
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id, userId } = await params;
    await removeMember(user.id, id, userId);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
