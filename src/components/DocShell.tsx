"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocalDoc } from "@/lib/collab/useLocalDoc";
import { useNetworkStatus } from "@/lib/collab/useNetworkStatus";
import { useVersionedSync } from "@/lib/versioning/useVersionedSync";
import { useRealtimeSync } from "@/lib/collab/useRealtimeSync";
import {
  ApiError,
  getDocument,
  type DocumentDetail,
} from "@/lib/api/client";
import { cacheDocDetail, readDocDetail } from "@/lib/cache/docCache";
import { FORMAT, LABELS, MESSAGES } from "@/lib/constants/strings";
import type { DocId } from "@/lib/collab/types";
import ConnectionStatus from "./ConnectionStatus";
import EditorToolbar from "./EditorToolbar";
import Editor from "./Editor";
import RoleBadge from "./RoleBadge";
import CollaboratorsPanel from "./CollaboratorsPanel";
import VersionHistoryPanel from "./VersionHistoryPanel";

interface DocShellProps {
  docId: DocId;
}

/**
 * Client container for a single document.
 *
 * Layout: a global doc header, then a three-column row — History (left),
 * the editor (center), and Collaborators (right). Each sidebar is independently
 * toggled and is sticky on desktop; on small screens the columns stack.
 *
 * Owns the local Yjs document (offline-first editing), the server metadata +
 * permissions, and the sync engine (offline→online merge + snapshots).
 */
export default function DocShell({ docId }: DocShellProps) {
  const { doc, ready, status } = useLocalDoc(docId);
  const online = useNetworkStatus();

  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Sidebars are independent — both can be open at once.
  const [showHistory, setShowHistory] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  /**
   * (Re)fetch document detail. LOCAL-FIRST: a failed fetch must never block the
   * editor — fall back to cache, then to an optimistic offline state.
   */
  const refresh = useCallback(async () => {
    try {
      const { document } = await getDocument(docId);
      setDetail(document);
      cacheDocDetail(document);
      setLoadError(null);
    } catch (err) {
      const cached = readDocDetail(docId);
      if (cached) {
        setDetail(cached);
        setLoadError(null);
        return;
      }
      const isAccessError =
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403 || err.status === 404);
      if (isAccessError) {
        setLoadError(MESSAGES.noAccess);
        return;
      }
      setDetail({
        id: docId,
        title: "Offline document",
        ownerId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: "EDITOR",
        memberships: [],
      });
      setLoadError(null);
    }
  }, [docId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Permission derived from role: owners/editors can write, viewers cannot.
  const canEdit = detail ? detail.role !== "VIEWER" : false;
  const isOwner = detail?.role === "OWNER";

  // Sync engine: hydrates from server, pushes offline edits, auto-snapshots.
  const { syncState, saveManualVersion, flush } = useVersionedSync({
    doc,
    documentId: docId,
    online,
    canWrite: canEdit,
  });

  // Real-time transport (additive): low-latency relay between collaborators.
  const { status: liveStatus } = useRealtimeSync(doc, docId);

  /** After a restore: pull the reverted state into the live doc, then refresh. */
  const handleRestored = useCallback(async () => {
    await flush();
    await refresh();
  }, [flush, refresh]);

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "#b91c1c" }}>
          {loadError}
        </p>
      </main>
    );
  }

  /** Shared aside styling: sticky on desktop, scrollable, themed surface. */
  const asideClass =
    "w-full lg:w-72 shrink-0 overflow-y-auto lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)]";
  const asideStyle = { background: "var(--surface)" } as const;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1">
      <header
        className="border-b px-4 py-3"
        style={{
          borderColor: "var(--border)",
          backgroundImage:
            "linear-gradient(180deg, color-mix(in srgb, var(--surface) 70%, transparent), transparent)",
        }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
        >
          ← {LABELS.yourDocuments}
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">
                {detail?.title ?? MESSAGES.loading}
              </h1>
              {detail && <RoleBadge role={detail.role} />}
            </div>
            <p className="text-xs text-[var(--muted)]">
              {canEdit ? syncStateLabel(syncState) : LABELS.readOnly} ·{" "}
              {LABELS.documentId}: {docId}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {liveStatus !== "disabled" && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: "var(--border)" }}
                title={
                  liveStatus === "connected"
                    ? "Real-time collaboration is active"
                    : "Connecting to the real-time server…"
                }
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      liveStatus === "connected" ? "#16a34a" : "#f59e0b",
                  }}
                />
                {liveStatus === "connected" ? "Live" : "Connecting…"}
              </span>
            )}
            <ConnectionStatus online={online} status={status} />
            {detail && (
              <>
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-pressed={showHistory}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                  style={{
                    borderColor: showHistory ? "var(--accent)" : "var(--border)",
                    ...(showHistory
                      ? { background: "rgba(37,99,235,0.10)", color: "var(--accent)" }
                      : {}),
                  }}
                >
                  <span aria-hidden>🕑</span>
                  {LABELS.history}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCollaborators((v) => !v)}
                  aria-pressed={showCollaborators}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                  style={{
                    borderColor: showCollaborators
                      ? "var(--accent)"
                      : "var(--border)",
                    ...(showCollaborators
                      ? { background: "rgba(37,99,235,0.10)", color: "var(--accent)" }
                      : {}),
                  }}
                >
                  <span aria-hidden>👥</span>
                  {FORMAT.collaboratorsWithCount(detail.memberships.length)}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Three-column workspace: History | Editor | Collaborators. */}
      <div className="flex flex-col items-start lg:flex-row">
        {showHistory && detail && (
          <aside
            className={`${asideClass} border-b lg:border-b-0 lg:border-r`}
            style={{ ...asideStyle, borderColor: "var(--border)" }}
            aria-label="Version history sidebar"
          >
            <VersionHistoryPanel
              documentId={docId}
              canWrite={canEdit}
              saveManualVersion={saveManualVersion}
              onRestored={handleRestored}
            />
          </aside>
        )}

        <div
          className="min-w-0 flex-1"
          style={{
            backgroundImage:
              "radial-gradient(60% 40% at 50% 0%, rgba(37,99,235,0.06), transparent 70%)",
          }}
        >
          {ready && doc ? (
            <Editor
              doc={doc}
              editable={canEdit}
              renderToolbar={({ editor, onAddImage }) => (
                <EditorToolbar editor={editor} onAddImage={onAddImage} />
              )}
            />
          ) : (
            <div
              className="mx-auto w-full max-w-3xl px-4 py-12 text-sm text-[var(--muted)]"
              aria-busy="true"
            >
              {MESSAGES.loadingDocLocal}
            </div>
          )}
        </div>

        {showCollaborators && detail && (
          <aside
            className={`${asideClass} border-t lg:border-t-0 lg:border-l`}
            style={{ ...asideStyle, borderColor: "var(--border)" }}
            aria-label="Collaborators sidebar"
          >
            <CollaboratorsPanel
              documentId={docId}
              canManage={isOwner}
              members={detail.memberships}
              onChanged={refresh}
            />
          </aside>
        )}
      </div>
    </main>
  );
}

/** Human-readable label for the sync engine state. */
function syncStateLabel(state: string): string {
  switch (state) {
    case "syncing":
      return MESSAGES.syncSyncing;
    case "offline":
      return MESSAGES.syncOffline;
    case "error":
      return MESSAGES.syncError;
    default:
      return MESSAGES.syncSynced;
  }
}
