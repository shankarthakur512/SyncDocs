/**
 * Wire/shared types for the versioning + sync subsystem.
 *
 * All binary CRDT data (Yjs updates/state) is transported as base64 strings so
 * it survives JSON. `Base64` documents that intent at the type level.
 */

export type Base64 = string;

/** How a snapshot was captured. Mirrors the Prisma `VersionKind` enum. */
export type VersionKind = "MANUAL" | "AUTO";

/** Version metadata returned to the client (never includes the heavy bytes). */
export interface VersionMeta {
  id: string;
  label: string | null;
  kind: VersionKind;
  createdById: string | null;
  createdAt: string; // ISO string over the wire
}

/**
 * Request body for the sync endpoint.
 *  - `update`: the client's local Yjs update (its offline edits), base64.
 *  - `stateVector`: what the client already has, so the server can reply with
 *    ONLY the ops the client is missing (a minimal delta). Optional: if absent,
 *    the server returns the full merged state.
 */
export interface SyncRequest {
  update: Base64;
  stateVector?: Base64;
}

/** Response from the sync endpoint: the delta the client should apply locally. */
export interface SyncResponse {
  /** Ops the client is missing (base64 Yjs update). Empty if already current. */
  update: Base64;
  /** When the server canonical state was last updated. */
  updatedAt: string;
}
