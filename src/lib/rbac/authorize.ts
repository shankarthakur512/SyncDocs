import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { can, type Permission } from "./roles";
import { ForbiddenError, NotFoundError } from "./errors";

/** The resolved authorization context for a (user, document) pair. */
export interface DocAuthContext {
  documentId: string;
  userId: string;
  role: Role;
}

/**
 * Resolves the user's role on a document, or `null` if they are not a member.
 *
 * This is the single source of truth for "what can this user do on this doc?".
 * Reading the role from `DocumentMembership` (rather than trusting any
 * client-supplied value) is what makes the RBAC tamper-proof.
 */
export async function getDocumentRole(
  userId: string,
  documentId: string,
): Promise<Role | null> {
  const membership = await prisma.documentMembership.findUnique({
    // Composite unique key generated from @@unique([documentId, userId]).
    where: { documentId_userId: { documentId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/**
 * Authorizes a single action and returns the auth context, or throws.
 *
 * SECURITY CHOICE: when the user has no membership we throw `NotFoundError`
 * (404) rather than `ForbiddenError` (403). Returning 403 would confirm the
 * document exists to someone with no access, leaking information; 404 keeps
 * non-members unable to even distinguish "missing" from "not allowed".
 *
 * @throws NotFoundError  if the user is not a member of the document
 * @throws ForbiddenError if the user's role lacks the requested permission
 */
export async function authorizeDocument(
  userId: string,
  documentId: string,
  permission: Permission,
): Promise<DocAuthContext> {
  const role = await getDocumentRole(userId, documentId);
  if (!role) throw new NotFoundError();
  if (!can(role, permission)) throw new ForbiddenError();
  return { documentId, userId, role };
}
