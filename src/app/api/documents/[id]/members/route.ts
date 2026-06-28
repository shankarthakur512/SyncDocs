import { requireUser } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/respond";
import { addMemberSchema } from "@/lib/validation/documents";
import { addMember, listMembers } from "@/lib/services/documents";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/documents/[id]/members
 * Lists collaborators. Requires membership (members:read).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const members = await listMembers(user.id, id);
    return ok({ members });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/documents/[id]/members
 * Invites a collaborator by email with EDITOR or VIEWER role.
 * Requires OWNER (members:manage).
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { email, role } = await readJson(request, addMemberSchema);
    const membership = await addMember(user.id, id, email, role);
    return ok({ membership }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
