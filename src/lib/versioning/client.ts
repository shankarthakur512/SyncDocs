import { ApiError } from "@/lib/api/client";
import type { SyncResponse, VersionMeta, VersionKind } from "./types";

/**
 * Browser fetch helpers for the sync + version endpoints. Kept in the versioning
 * folder so all sync/version logic stays in one place. Errors surface as the
 * shared {@link ApiError}.
 */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(
      body?.message ?? "Request failed.",
      res.status,
      body?.error ?? "UNKNOWN",
    );
  }
  return body as T;
}

/** Read-only hydration of the canonical state (base64). Used on first load. */
export function fetchState(documentId: string): Promise<{ state: string }> {
  return fetchJson(`/api/documents/${documentId}/state`);
}

/** Push local edits and pull back the delta the client is missing. */
export function pushSync(
  documentId: string,
  update: string,
  stateVector?: string,
): Promise<SyncResponse> {
  return fetchJson(`/api/documents/${documentId}/sync`, {
    method: "POST",
    body: JSON.stringify({ update, stateVector }),
  });
}

/** List version history metadata. */
export function fetchVersions(
  documentId: string,
): Promise<{ versions: VersionMeta[] }> {
  return fetchJson(`/api/documents/${documentId}/versions`);
}

/** Save a snapshot of the current state. */
export function saveVersion(
  documentId: string,
  label?: string,
  kind: VersionKind = "MANUAL",
): Promise<{ version: VersionMeta }> {
  return fetchJson(`/api/documents/${documentId}/versions`, {
    method: "POST",
    body: JSON.stringify({ label, kind }),
  });
}

/** Fetch a single version's encoded state (base64) for preview. */
export function fetchVersionState(
  documentId: string,
  versionId: string,
): Promise<{ state: string }> {
  return fetchJson(`/api/documents/${documentId}/versions/${versionId}`);
}

/** Restore the document to a version (non-destructive). */
export function restoreVersion(
  documentId: string,
  versionId: string,
): Promise<{ updatedAt: string }> {
  return fetchJson(
    `/api/documents/${documentId}/versions/${versionId}/restore`,
    { method: "POST" },
  );
}
