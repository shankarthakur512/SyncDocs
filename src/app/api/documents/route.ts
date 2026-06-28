import { requireUser } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/respond";
import { createDocumentSchema } from "@/lib/validation/documents";
import { createDocument, listUserDocuments } from "@/lib/services/documents";

/**
 * GET /api/documents
 * Lists the documents the signed-in user can access (with their role).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const documents = await listUserDocuments(user.id);
    return ok({ documents });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/documents
 * Creates a new document owned by the signed-in user.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { title } = await readJson(request, createDocumentSchema);
    const document = await createDocument(user.id, title);
    return ok({ document }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
