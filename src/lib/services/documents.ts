import { randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorizeDocument, getDocumentRole } from "@/lib/rbac/authorize";
import { NotFoundError, ValidationError } from "@/lib/rbac/errors";

/**
 * Documents service.
 *
 * All data access for documents/memberships funnels through here so that:
 *
 * Route handlers stay thin and just translate HTTP ⇄ these functions.
 */

/** Shape returned to the client for a document the user can access. */
export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  /** The caller's role on this document. */
  role: Role;
}

/** Lists every document the user is a member of, newest first, with their role. */
export async function listUserDocuments(
  userId: string,
): Promise<DocumentSummary[]> {
  const memberships = await prisma.documentMembership.findMany({
    where: { userId },
    select: {
      role: true,
      document: {
        select: {
          id: true,
          title: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return memberships.map((m) => ({ ...m.document, role: m.role }));
}

/**
 * Creates a document and its OWNER membership atomically.
 * The transaction guarantees we never end up with a document that has no owner.
 */
export async function createDocument(userId: string, title?: string) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: { ownerId: userId, ...(title ? { title } : {}) },
    });
    await tx.documentMembership.create({
      data: { documentId: doc.id, userId, role: "OWNER" },
    });
    return doc;
  });
}

/** Reads a document (with collaborators) if the caller may view it. */
export async function getDocument(userId: string, documentId: string) {
  const { role } = await authorizeDocument(userId, documentId, "document:read");

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      memberships: {
        select: {
          role: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!doc) throw new NotFoundError();

  return { ...doc, role };
}

/** Renames a document. Requires `document:update-meta` (OWNER). */
export async function updateDocument(
  userId: string,
  documentId: string,
  title: string,
) {
  await authorizeDocument(userId, documentId, "document:update-meta");
  return prisma.document.update({
    where: { id: documentId },
    data: { title },
  });
}

/** Deletes a document (cascades memberships). Requires `document:delete` (OWNER). */
export async function deleteDocument(userId: string, documentId: string) {
  await authorizeDocument(userId, documentId, "document:delete");
  await prisma.document.delete({ where: { id: documentId } });
}

/** Lists collaborators if the caller may see them. */
export async function listMembers(userId: string, documentId: string) {
  await authorizeDocument(userId, documentId, "members:read");
  return prisma.documentMembership.findMany({
    where: { documentId },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Invites (or updates) a collaborator by email. Requires `members:manage` (OWNER).
 * OWNER cannot be granted here — see {@link addMemberSchema}.
 */
export async function addMember(
  userId: string,
  documentId: string,
  email: string,
  role: Exclude<Role, "OWNER">,
) {
  await authorizeDocument(userId, documentId, "members:manage");

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  // 404 (not 403) avoids confirming whether an email maps to an account.
  if (!target) throw new NotFoundError("No user found with that email.");

  return prisma.documentMembership.upsert({
    where: { documentId_userId: { documentId, userId: target.id } },
    update: { role },
    create: { documentId, userId: target.id, role },
  });
}

/**
 * Changes a collaborator's role. Requires `members:manage` (OWNER).
 * Enforces the invariant that a document always retains at least one OWNER.
 */
export async function updateMemberRole(
  userId: string,
  documentId: string,
  targetUserId: string,
  role: Role,
) {
  await authorizeDocument(userId, documentId, "members:manage");
  await assertNotLastOwner(documentId, targetUserId, role);

  const existing = await getDocumentRole(targetUserId, documentId);
  if (!existing) throw new NotFoundError("That user is not a collaborator.");

  return prisma.documentMembership.update({
    where: { documentId_userId: { documentId, userId: targetUserId } },
    data: { role },
  });
}

/** Removes a collaborator. Requires `members:manage` (OWNER). */
export async function removeMember(
  userId: string,
  documentId: string,
  targetUserId: string,
) {
  await authorizeDocument(userId, documentId, "members:manage");
  // Removing counts as demoting to "no role" — must not drop the last owner.
  await assertNotLastOwner(documentId, targetUserId, null);

  await prisma.documentMembership.delete({
    where: { documentId_userId: { documentId, userId: targetUserId } },
  });
}

/* -------------------------------------------------------------------------- */
/* Guest access via shareable link                                             */
/* -------------------------------------------------------------------------- */

/**
 * The share link is a CAPABILITY: possession of the unguessable token grants
 * read-only access, with no account required. All management operations require
 * `members:manage` (OWNER), mirroring collaborator management.
 */

/** Returns the current share token (or null if sharing is off). Owner only. */
export async function getShareToken(userId: string, documentId: string) {
  await authorizeDocument(userId, documentId, "members:manage");
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { shareToken: true },
  });
  if (!doc) throw new NotFoundError();
  return doc.shareToken;
}

/**
 * Enables link sharing, generating a fresh token if none exists yet.
 * 192 bits of randomness, base64url — unguessable and URL-safe.
 */
export async function enableShareLink(userId: string, documentId: string) {
  await authorizeDocument(userId, documentId, "members:manage");

  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    select: { shareToken: true },
  });
  if (existing?.shareToken) return existing.shareToken; // already enabled

  const token = randomBytes(24).toString("base64url");
  await prisma.document.update({
    where: { id: documentId },
    data: { shareToken: token },
  });
  return token;
}

/** Disables link sharing — existing links stop working immediately. */
export async function disableShareLink(userId: string, documentId: string) {
  await authorizeDocument(userId, documentId, "members:manage");
  await prisma.document.update({
    where: { id: documentId },
    data: { shareToken: null },
  });
}

/**
 * Resolves a share token to its document's public metadata — the ONLY
 * unauthenticated read path. Returns 404 for unknown/disabled tokens so probing
 * reveals nothing (mirrors the membership 404 policy).
 */
export async function getDocumentByShareToken(token: string) {
  const doc = await prisma.document.findUnique({
    where: { shareToken: token },
    select: { id: true, title: true, updatedAt: true },
  });
  if (!doc) throw new NotFoundError("Share link not found.");
  return doc;
}

/**
 * Guards the "≥1 owner" invariant.
 *
 * If the target is currently the sole OWNER and the proposed `nextRole` is
 * anything other than OWNER (including removal → `null`), the operation would
 * leave the document ownerless and is rejected.
 */
async function assertNotLastOwner(
  documentId: string,
  targetUserId: string,
  nextRole: Role | null,
) {
  if (nextRole === "OWNER") return; // still an owner afterwards

  const targetRole = await getDocumentRole(targetUserId, documentId);
  if (targetRole !== "OWNER") return; // wasn't an owner, invariant unaffected

  const ownerCount = await prisma.documentMembership.count({
    where: { documentId, role: "OWNER" },
  });
  if (ownerCount <= 1) {
    throw new ValidationError("A document must always have at least one owner.");
  }
}
