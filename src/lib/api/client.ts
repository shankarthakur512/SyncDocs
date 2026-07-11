/**
 * Typed browser-side client for the documents/members REST API.
 *
 * Centralising fetch logic here keeps components clean and guarantees every
 * call shares the same error handling (throwing a typed {@link ApiError}) and
 * JSON conventions. All endpoints require an authenticated session (enforced by
 * middleware + the route handlers); 401/403/404 surface as ApiError.
 */

export type Role = "OWNER" | "EDITOR" | "VIEWER";

/** A document as listed on the home screen, including the caller's role. */
export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
}

/** A collaborator on a document. */
export interface Member {
  role: Role;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

/** Full document detail returned when opening a document. */
export interface DocumentDetail {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  memberships: Member[];
}

/** Error carrying the HTTP status and the API's machine-readable code. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Thin wrapper around fetch that parses JSON and converts non-2xx responses
 * into a typed ApiError using the server's `{ error, message }` envelope.
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  // 204/empty bodies are tolerated.
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

// --- Documents -------------------------------------------------------------

export function listDocuments(): Promise<{ documents: DocumentSummary[] }> {
  return request("/api/documents");
}

export function createDocument(
  title?: string,
): Promise<{ document: DocumentSummary }> {
  return request("/api/documents", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function getDocument(id: string): Promise<{ document: DocumentDetail }> {
  return request(`/api/documents/${id}`);
}

export function renameDocument(
  id: string,
  title: string,
): Promise<{ document: DocumentSummary }> {
  return request(`/api/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteDocument(id: string): Promise<{ success: true }> {
  return request(`/api/documents/${id}`, { method: "DELETE" });
}

// --- Members ---------------------------------------------------------------

export function addMember(
  documentId: string,
  email: string,
  role: Exclude<Role, "OWNER">,
): Promise<{ membership: unknown }> {
  return request(`/api/documents/${documentId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export function updateMemberRole(
  documentId: string,
  userId: string,
  role: Role,
): Promise<{ membership: unknown }> {
  return request(`/api/documents/${documentId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(
  documentId: string,
  userId: string,
): Promise<{ success: true }> {
  return request(`/api/documents/${documentId}/members/${userId}`, {
    method: "DELETE",
  });
}

// --- Guest share links (owner-managed) ---------------------------------------

/** Current share token for a document (null = link sharing off). Owner only. */
export function getShareToken(
  documentId: string,
): Promise<{ token: string | null }> {
  return request(`/api/documents/${documentId}/share`);
}

/** Enables link sharing (idempotent) and returns the token. Owner only. */
export function enableShareLink(
  documentId: string,
): Promise<{ token: string }> {
  return request(`/api/documents/${documentId}/share`, { method: "POST" });
}

/** Disables link sharing — the public link stops working. Owner only. */
export function disableShareLink(
  documentId: string,
): Promise<{ success: true }> {
  return request(`/api/documents/${documentId}/share`, { method: "DELETE" });
}

/** Builds the public guest URL for a share token (browser only). */
export function shareUrlFor(token: string): string {
  return `${window.location.origin}/share/${token}`;
}
