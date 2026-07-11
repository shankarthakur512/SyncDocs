import { requireUser } from "@/lib/auth/session";
import { handleError, ok } from "@/lib/api/respond";
import {
  disableShareLink,
  enableShareLink,
  getShareToken,
} from "@/lib/services/documents";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Share-link management (OWNER only, via `members:manage`):
 *
 *   GET    /api/documents/[id]/share  → current token (null = sharing off)
 *   POST   /api/documents/[id]/share  → enable sharing (creates token if none)
 *   DELETE /api/documents/[id]/share  → disable sharing (revokes the link)
 *
 * The browser composes the public URL as `${origin}/share/<token>`.
 */

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const token = await getShareToken(user.id, id);
    return ok({ token });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const token = await enableShareLink(user.id, id);
    return ok({ token });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await disableShareLink(user.id, id);
    return ok({ success: true as const });
  } catch (err) {
    return handleError(err);
  }
}
