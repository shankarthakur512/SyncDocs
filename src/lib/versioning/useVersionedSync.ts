"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { applyToDoc, encodeState, encodeVector, fromBase64, toBase64 } from "./crdt";
import { fetchState, pushSync, saveVersion as apiSaveVersion } from "./client";
import type { VersionMeta } from "./types";

/**
 * =============================================================================
 * CLIENT SYNC ENGINE
 * =============================================================================
 *
 * Bridges the local Yjs document (offline source of truth) with the server's
 * canonical state. Responsibilities:
 *
 *   1. HYDRATE on open: pull the server state once and merge it locally (so a
 *      freshly-invited collaborator / new device sees existing content).
 *   2. PUSH on change: debounce local edits, then send them and apply the
 *      server's reply delta — the offline→online reconciliation (see README).
 *   3. FLUSH on reconnect: when the network returns, immediately push the queued
 *      offline edits.
 *   4. SNAPSHOT automatically on an interval when the doc changed (plus the
 *      manual "Save version" path).
 *
 * VIEWERS hydrate (read) but never push (RBAC: they lack document:write), so the
 * engine simply skips the push path for them.
 */

export type SyncState = "idle" | "syncing" | "offline" | "error";

interface Options {
  doc: Y.Doc | null;
  documentId: string;
  online: boolean;
  canWrite: boolean;
}

interface VersionedSync {
  syncState: SyncState;
  lastSyncedAt: number | null;
  /** Force a push/pull cycle (used after a restore to pull the new state). */
  flush: () => Promise<void>;
  /** Flush then capture a MANUAL snapshot of the (now-synced) server state. */
  saveManualVersion: (label?: string) => Promise<VersionMeta | null>;
}

/** Tag marking updates the engine applied, so we don't treat them as user edits. */
const SYNC_ORIGIN = "sync-engine";
/** Debounce window for coalescing rapid keystrokes into one push. */
const DEBOUNCE_MS = 800;
/** Background re-sync cadence (catches remote changes from other clients). */
const POLL_MS = 15_000;
/** Automatic snapshot cadence (only fires when there are unsnapshotted changes). */
const AUTO_SNAPSHOT_MS = 2 * 60_000;

export function useVersionedSync({
  doc,
  documentId,
  online,
  canWrite,
}: Options): VersionedSync {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Refs hold mutable engine state without causing re-renders.
  const syncingRef = useRef(false); // a push is in flight
  const dirtyRef = useRef(false); // local edits not yet pushed
  const dirtySinceSnapshotRef = useRef(false); // edits not yet snapshotted
  const hydratedRef = useRef(false); // initial pull completed
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-fresh flush reference so timers/listeners call the latest closure.
  const flushRef = useRef<() => Promise<void>>(async () => {});

  /** Push local state, apply the server's reply delta. No-op for viewers. */
  const flush = useCallback(async () => {
    if (!doc || !canWrite) return;
    if (!online) {
      setSyncState("offline");
      return;
    }
    if (syncingRef.current) return; // coalesce concurrent flushes
    syncingRef.current = true;
    setSyncState("syncing");

    // RACE FIX: clear the dirty flag BEFORE encoding, not after the await.
    // Any edit that lands while the push is in flight re-marks dirty (via the
    // update listener) and is picked up by the follow-up flush below. Clearing
    // it after the await used to wipe those in-flight edits' dirty mark,
    // leaving them unsynced until the user happened to type again.
    dirtyRef.current = false;

    let pushedOk = false;
    try {
      const update = toBase64(encodeState(doc));
      const stateVector = toBase64(encodeVector(doc));
      const res = await pushSync(documentId, update, stateVector);

      // Merge whatever the server had that we didn't (other clients' edits).
      const delta = fromBase64(res.update);
      if (delta.length > 0) applyToDoc(doc, delta, SYNC_ORIGIN);

      pushedOk = true;
      setLastSyncedAt(Date.now());
      setSyncState("idle");
    } catch {
      // Restore dirty so the poll/debounce retries; surface the error state.
      dirtyRef.current = true;
      setSyncState("error");
    } finally {
      syncingRef.current = false;
      // Edits arrived mid-push — sync them immediately instead of waiting for
      // the next debounce/poll. Only after a SUCCESSFUL push (prevents a tight
      // retry loop while the server is unreachable).
      if (pushedOk && dirtyRef.current) void flushRef.current();
    }
  }, [doc, documentId, online, canWrite]);

  // Keep the ref pointing at the latest flush implementation.
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // 1) Initial hydrate from the server (read), then a first push if allowed.
  useEffect(() => {
    if (!doc) return;
    let active = true;
    hydratedRef.current = false;

    (async () => {
      try {
        const { state } = await fetchState(documentId);
        const bytes = fromBase64(state);
        if (active && bytes.length > 0) applyToDoc(doc, bytes, SYNC_ORIGIN);
      } catch {
        // Offline or no access yet — local content still works.
      } finally {
        if (active) {
          hydratedRef.current = true;
          void flushRef.current();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [doc, documentId]);

  // 2) Listen for local edits → mark dirty → debounce a push.
  useEffect(() => {
    if (!doc) return;
    const onUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === SYNC_ORIGIN) return; // ignore our own applied deltas
      dirtyRef.current = true;
      dirtySinceSnapshotRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void flushRef.current(), DEBOUNCE_MS);
    };
    doc.on("update", onUpdate);
    return () => {
      doc.off("update", onUpdate);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [doc]);

  // 3) Flush immediately when the network comes back; reflect offline state.
  useEffect(() => {
    if (!doc) return;
    if (online) {
      if (hydratedRef.current && dirtyRef.current) void flushRef.current();
    } else {
      setSyncState("offline");
    }
  }, [online, doc]);

  // 4) Background poll + automatic snapshots.
  useEffect(() => {
    if (!doc || !canWrite) return;

    const poll = setInterval(() => {
      if (online && dirtyRef.current) void flushRef.current();
    }, POLL_MS);

    const snap = setInterval(async () => {
      if (!online || !dirtySinceSnapshotRef.current) return;
      try {
        await flushRef.current(); // ensure server has the latest before snapshot
        await apiSaveVersion(documentId, undefined, "AUTO");
        dirtySinceSnapshotRef.current = false;
      } catch {
        // Will retry on the next interval.
      }
    }, AUTO_SNAPSHOT_MS);

    return () => {
      clearInterval(poll);
      clearInterval(snap);
    };
  }, [doc, canWrite, online, documentId]);

  /** Flush, then snapshot the now-synced server state as a MANUAL version. */
  const saveManualVersion = useCallback(
    async (label?: string): Promise<VersionMeta | null> => {
      if (!canWrite) return null;
      await flushRef.current();
      const { version } = await apiSaveVersion(documentId, label, "MANUAL");
      dirtySinceSnapshotRef.current = false;
      return version;
    },
    [canWrite, documentId],
  );

  return { syncState, lastSyncedAt, flush, saveManualVersion };
}
