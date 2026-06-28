"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import type { DocId, SyncStatus } from "./types";

/**
 * Result returned by {@link useLocalDoc}.
 */
export interface LocalDoc {
  /** The Yjs document — the single client-side source of truth. */
  doc: Y.Doc | null;
  /** True once the document has hydrated from IndexedDB. */
  ready: boolean;
  /** Coarse status for UI indicators. */
  status: SyncStatus;
}

/**
 * Creates a Yjs document for `docId` and persists it to IndexedDB.
 *
 * LOCAL-FIRST CONTRACT
 * --------------------
 * IndexedDB is the primary store. All edits are applied to the in-memory Y.Doc
 * synchronously (zero network on the hot path) and flushed to IndexedDB by the
 * persistence provider in the background. Because the data is a CRDT, a future
 * network provider can be layered on top without any change here: remote updates
 * simply merge into the same Y.Doc and converge deterministically.
 *
 * The document instance is created once per `docId` and torn down on unmount /
 * id change to avoid leaking IndexedDB connections and update listeners — an
 * important detail for browser-based memory management.
 */
export function useLocalDoc(docId: DocId): LocalDoc {
  // Refs hold the long-lived, non-render-affecting instances.
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<IndexeddbPersistence | null>(null);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("initializing");

  useEffect(() => {
    // Guard against SSR: IndexedDB only exists in the browser.
    if (typeof window === "undefined") return;

    // Create a fresh Y.Doc and bind it to an IndexedDB store named after the id.
    const doc = new Y.Doc();
    const provider = new IndexeddbPersistence(`doc:${docId}`, doc);

    docRef.current = doc;
    providerRef.current = provider;
    setReady(false);
    setStatus("initializing");

    // Fired once the locally-stored state has been loaded into the doc.
    const handleSynced = () => {
      setReady(true);
      setStatus("local-ready");
    };
    provider.on("synced", handleSynced);

    // Cleanup: destroy provider + doc so the next id starts clean and no
    // listeners or IndexedDB handles leak between documents.
    return () => {
      provider.off("synced", handleSynced);
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
    };
  }, [docId]);

  return { doc: docRef.current, ready, status };
}
