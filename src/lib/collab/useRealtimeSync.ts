"use client";

import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

/**
 * Real-time transport hook.
 *
 * Binds the SAME local Y.Doc to the WebSocket relay so edits propagate between
 * collaborators with sub-second latency. This is ADDITIVE to the HTTP sync
 * engine (which owns durable persistence): the provider handles instant
 * peer-to-peer relay + offline buffering, while HTTP `/sync` persists to
 * Postgres. Both feed the same CRDT, so they converge losslessly.
 *
 * If `NEXT_PUBLIC_SYNC_WS_URL` is unset, realtime is simply disabled and the app
 * keeps working over HTTP sync alone.
 */

const WS_URL = process.env.NEXT_PUBLIC_SYNC_WS_URL;

export type RealtimeStatus =
  | "disabled" // no WS URL configured
  | "connecting"
  | "connected"
  | "disconnected";

export function useRealtimeSync(
  doc: Y.Doc | null,
  documentId: string,
): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>(
    WS_URL ? "connecting" : "disabled",
  );

  useEffect(() => {
    if (!doc || !WS_URL) return;

    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: documentId,
      document: doc,
      // A function token is re-evaluated on (re)connect, so it never expires
      // mid-session — the relay always receives a fresh, document-scoped JWT.
      token: async () => {
        const res = await fetch(`/api/documents/${documentId}/sync-token`);
        if (!res.ok) throw new Error("Could not obtain sync token.");
        const { token } = (await res.json()) as { token: string };
        return token;
      },
      onStatus: ({ status }: { status: string }) => {
        setStatus(
          status === "connected"
            ? "connected"
            : status === "connecting"
              ? "connecting"
              : "disconnected",
        );
      },
    });

    // Tear down the connection + listeners when the document/page changes.
    return () => {
      provider.destroy();
    };
  }, [doc, documentId]);

  return { status };
}
