import { prisma } from "@/lib/db";
import { authorizeDocument } from "@/lib/rbac/authorize";
import { NotFoundError } from "@/lib/rbac/errors";
import {
  diffForClient,
  emptyState,
  fromBase64,
  mergeState,
  revertContent,
  stateVectorOf,
  toBase64,
} from "./crdt";
import type { SyncResponse, VersionKind } from "./types";

/**
 * Server-side versioning + sync service.
 *
 * This is the only module that touches the canonical CRDT state and version
 * rows. Every entry point is RBAC-checked:
 *   - sync / save / restore require `document:write` (VIEWERs are blocked),
 *   - listing / reading versions require `document:read` (membership).
 */

/** Reads the canonical state for a document, or an empty doc state if none yet. */
async function loadCanonical(documentId: string): Promise<Uint8Array> {
  const row = await prisma.documentState.findUnique({ where: { documentId } });
  return row ? new Uint8Array(row.state) : emptyState();
}

/**
 * Merges a client's offline update into the canonical state and returns the
 * delta the client is missing. THIS is the offline→online reconciliation.
 *
 * Wrapped in a transaction so the read-merge-write is atomic. (Note: under high
 * concurrency a row lock would further harden this; in practice writes funnel
 * through one authority. Even a lost write is non-fatal because merges are
 * commutative — the next sync re-reconciles.)
 */
export async function syncDocument(
  userId: string,
  documentId: string,
  updateB64: string,
  clientStateVectorB64?: string,
): Promise<SyncResponse> {
  await authorizeDocument(userId, documentId, "document:write");

  const incoming = fromBase64(updateB64);

  const merged = await prisma.$transaction(async (tx) => {
    const row = await tx.documentState.findUnique({ where: { documentId } });
    const canonical = row ? new Uint8Array(row.state) : emptyState();

    // The merge — order-independent, lossless union of all edits.
    const next = mergeState(canonical, incoming);

    await tx.documentState.upsert({
      where: { documentId },
      create: { documentId, state: Buffer.from(next) },
      update: { state: Buffer.from(next) },
    });
    return next;
  });

  // Reply with only what the client lacks (minimal delta), or the full state.
  const delta = clientStateVectorB64
    ? diffForClient(merged, fromBase64(clientStateVectorB64))
    : merged;

  return { update: toBase64(delta), updatedAt: new Date().toISOString() };
}

/** Lists version metadata (no heavy bytes), newest first. */
export async function listVersions(userId: string, documentId: string) {
  await authorizeDocument(userId, documentId, "document:read");
  return prisma.documentVersion.findMany({
    where: { documentId },
    select: {
      id: true,
      label: true,
      kind: true,
      createdById: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Returns a single version's full encoded state (base64) for preview/time-travel. */
export async function getVersionState(
  userId: string,
  documentId: string,
  versionId: string,
): Promise<string> {
  await authorizeDocument(userId, documentId, "document:read");
  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
    select: { state: true },
  });
  if (!version) throw new NotFoundError("Version not found.");
  return toBase64(new Uint8Array(version.state));
}

/** Captures the current canonical state as a new version (snapshot). */
export async function saveVersion(
  userId: string,
  documentId: string,
  label: string | undefined,
  kind: VersionKind,
) {
  await authorizeDocument(userId, documentId, "document:write");
  const state = await loadCanonical(documentId);

  return prisma.documentVersion.create({
    data: {
      documentId,
      label: label ?? null,
      kind,
      createdById: userId,
      state: Buffer.from(state),
    },
    select: {
      id: true,
      label: true,
      kind: true,
      createdById: true,
      createdAt: true,
    },
  });
}

/**
 * Restores a document to a previous version — non-destructively.
 *
 * 1. Snapshot the CURRENT state as an AUTO safety version (reversible restore).
 * 2. Set canonical = merge(current, target) — a valid forward CRDT step.
 * Clients converge on their next sync.
 */
export async function restoreVersion(
  userId: string,
  documentId: string,
  versionId: string,
): Promise<{ updatedAt: string }> {
  await authorizeDocument(userId, documentId, "document:write");

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
    select: { state: true },
  });
  if (!version) throw new NotFoundError("Version not found.");
  const target = new Uint8Array(version.state);

  await prisma.$transaction(async (tx) => {
    const row = await tx.documentState.findUnique({ where: { documentId } });
    const current = row ? new Uint8Array(row.state) : emptyState();

    // 1) Safety snapshot of current work — restore is always reversible.
    await tx.documentVersion.create({
      data: {
        documentId,
        label: "Auto-saved before restore",
        kind: "AUTO",
        createdById: userId,
        state: Buffer.from(current),
      },
    });

    // 2) Forward-revert: rewrite content to match the target version.
    const next = revertContent(current, target);
    await tx.documentState.upsert({
      where: { documentId },
      create: { documentId, state: Buffer.from(next) },
      update: { state: Buffer.from(next) },
    });
  });

  // Touch the document so its @updatedAt refreshes (empty update still bumps it).
  await prisma.document.update({ where: { id: documentId }, data: {} });

  return { updatedAt: new Date().toISOString() };
}

/** Exposed for the client engine: state vector of the current canonical state. */
export async function canonicalStateVector(
  userId: string,
  documentId: string,
): Promise<string> {
  await authorizeDocument(userId, documentId, "document:read");
  const state = await loadCanonical(documentId);
  return toBase64(stateVectorOf(state));
}

/**
 * Read-only hydration: returns the full canonical state (base64).
 * Requires only `document:read`, so VIEWERs can load content without the
 * ability to push changes — the read counterpart to {@link syncDocument}.
 */
export async function readCanonicalState(
  userId: string,
  documentId: string,
): Promise<string> {
  await authorizeDocument(userId, documentId, "document:read");
  const state = await loadCanonical(documentId);
  return toBase64(state);
}
