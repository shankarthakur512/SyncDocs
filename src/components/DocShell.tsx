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
  renameDocument,
  type DocumentDetail,
} from "@/lib/api/client";
import { cacheDocDetail, readDocDetail } from "@/lib/cache/docCache";
import { FORMAT, LABELS, MESSAGES } from "@/lib/constants/strings";
import type { DocId } from "@/lib/collab/types";
import { History, Users } from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";
import EditorToolbar from "./EditorToolbar";
import Editor from "./Editor";
import RoleBadge from "./RoleBadge";
import CollaboratorsPanel from "./CollaboratorsPanel";
import VersionHistoryPanel from "./VersionHistoryPanel";
import ShareMenu from "./ShareMenu";

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
  // Inline title rename (owners only): null = viewing, string = editing draft.
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);

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

  /**
   * Commits an inline title rename (owners only). No-ops on unchanged/empty
   * drafts; optimistically updates local state + the offline cache on success.
   */
  const commitTitle = useCallback(async () => {
    if (titleDraft === null || !detail) return;
    const next = titleDraft.trim();
    if (!next || next === detail.title) {
      setTitleDraft(null); // nothing to save
      return;
    }
    setSavingTitle(true);
    try {
      await renameDocument(docId, next);
      const updated = { ...detail, title: next };
      setDetail(updated);
      cacheDocDetail(updated); // keep the offline cache consistent
      setTitleDraft(null);
    } catch {
      // Keep the draft so the user can retry or Escape to discard.
    } finally {
      setSavingTitle(false);
    }
  }, [titleDraft, detail, docId]);

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--danger)" }}>
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
              {isOwner && titleDraft !== null ? (
                // Inline rename: Enter/blur saves, Escape discards.
                <input
                  autoFocus
                  value={titleDraft}
                  disabled={savingTitle}
                  maxLength={200}
                  aria-label={LABELS.newDocumentTitle}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => void commitTitle()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitTitle();
                    if (e.key === "Escape") setTitleDraft(null);
                  }}
                  className="font-display min-w-0 rounded-md border px-2 py-0.5 text-lg font-semibold outline-none focus:border-[var(--accent)]"
                  style={{
                    borderColor: "var(--border)",
                    background: "transparent",
                  }}
                />
              ) : (
                <h1
                  className={[
                    // Spec: page titles are Source Serif (document identity).
                    "font-display truncate text-lg font-semibold",
                    isOwner
                      ? "cursor-text rounded-md px-1 -mx-1 transition-colors hover:bg-[rgba(127,127,127,0.10)]"
                      : "",
                  ].join(" ")}
                  title={isOwner ? LABELS.renameHint : undefined}
                  onClick={() => {
                    if (isOwner && detail) setTitleDraft(detail.title);
                  }}
                >
                  {detail?.title ?? MESSAGES.loading}
                </h1>
              )}
              {detail && <RoleBadge role={detail.role} />}
            </div>
            <p className="text-xs text-[var(--muted)]">
              {canEdit ? syncStateLabel(syncState) : LABELS.readOnly} ·{" "}
              {LABELS.documentId}: {docId}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Share (owners only) — the primary header action, Docs-style. */}
            <ShareMenu documentId={docId} canManage={isOwner} />
            {liveStatus !== "disabled" && (
              <span
                className="chip"
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
                      liveStatus === "connected" ? "var(--success)" : "var(--warn)",
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
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : {}),
                  }}
                >
                  <History size={15} strokeWidth={2} aria-hidden />
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
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : {}),
                  }}
                >
                  <Users size={15} strokeWidth={2} aria-hidden />
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

        {/* Flat app canvas per the redesign — the page card provides contrast. */}
        <div className="min-w-0 flex-1">
          {ready && doc ? (
            <Editor
              doc={doc}
              documentId={docId}
              online={online}
              editable={canEdit}
              renderToolbar={({ editor, onAddImage, ai }) => (
                <EditorToolbar editor={editor} onAddImage={onAddImage} ai={ai} />
              )}
            />
          ) : (
            // Skeleton "page" while the local IndexedDB copy hydrates.
            <div
              className="mx-auto w-full max-w-3xl px-4 py-6"
              aria-busy="true"
              aria-label={MESSAGES.loadingDocLocal}
            >
              <div
                className="animate-pulse rounded-xl border p-10 shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="h-6 w-2/5 rounded bg-[rgba(127,127,127,0.15)]" />
                <div className="mt-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-3.5 rounded bg-[rgba(127,127,127,0.12)]"
                      style={{ width: `${90 - i * 12}%` }}
                    />
                  ))}
                </div>
              </div>
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
