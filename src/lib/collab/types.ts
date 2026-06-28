/*
  file: src/lib/collab/types.ts
  description: Shared types for the collaboration/versioning core.
  author: Shankar Thakur
*/


/**
 * Shared types for the collaboration/versioning core.
 *
 * This module is intentionally framework-agnostic and content-agnostic: it only
 * deals with an abstract Yjs document identified by a string id. That keeps the
 * door open to extracting it into a standalone, reusable "collab + versioning
 * service" later (see project plan).
 */

/** Identifies a single collaborative document. */
export type DocId = string;

/**
 * Local persistence/connection status, surfaced to the UI so the user always
 * knows whether their work is safely stored locally and/or synced remotely.
 *
 * Phase 1 only uses `local` states; `online`/`offline`/`syncing` become
 * meaningful once the network provider (Phase 2) is wired in.
 */
export type SyncStatus =
  | "initializing" // IndexedDB not yet loaded
  | "local-ready" // loaded from IndexedDB, safe to edit offline
  | "offline" // network provider present but disconnected
  | "syncing" // pushing/pulling remote changes
  | "online"; // fully synced with the server

/** Role-based access, enforced server-side in Phase 2. */
export type DocRole = "owner" | "editor" | "viewer";
