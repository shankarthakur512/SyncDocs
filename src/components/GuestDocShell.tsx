"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Y from "yjs";
import { applyToDoc, fromBase64 } from "@/lib/versioning/crdt";
import { useRealtimeSync } from "@/lib/collab/useRealtimeSync";
import { ACTIONS, LABELS, MESSAGES } from "@/lib/constants/strings";
import Editor from "./Editor";

interface GuestDocShellProps {
  /** The share-link capability token from the URL. */
  shareToken: string;
}

/** Public metadata returned by /api/share/[token]. */
interface SharedDocMeta {
  id: string;
  title: string;
  updatedAt: string;
}

/** Fallback poll cadence when the realtime relay is unavailable. */
const GUEST_POLL_MS = 30_000;

/**
 * Read-only document view for guests (no account, no sign-in).
 *
 * Differences from the member `DocShell`, by design:
 *   - EPHEMERAL Y.Doc: nothing is written to IndexedDB/localStorage — a guest
 *     device never persists someone else's document.
 *   - Hydrates over the PUBLIC share endpoints (token = capability).
 *   - Live updates via the WebSocket relay using a guest VIEWER token, which
 *     the relay enforces as read-only; if the relay is unreachable, a slow
 *     HTTP poll keeps the view reasonably fresh (merges are idempotent).
 *   - The editor is always `editable={false}` — and even a tampered client
 *     could not write: there is no share-token HTTP sync endpoint, and the WS
 *     connection is server-side read-only.
 */
export default function GuestDocShell({ shareToken }: GuestDocShellProps) {
  const [meta, setMeta] = useState<SharedDocMeta | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  /**
   * Failure modes are deliberately separated:
   *  - "invalid": the server said 404 — the token doesn't exist / was revoked.
   *  - "error": anything else (500, network) — the LINK may be fine, so we show
   *    a retry instead of wrongly blaming the link.
   */
  const [failure, setFailure] = useState<"invalid" | "error" | null>(null);
  const [attempt, setAttempt] = useState(0); // bump to re-run the load effect
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live updates through the relay, authenticated with a guest VIEWER token.
  const { status: liveStatus } = useRealtimeSync(
    doc,
    meta?.id ?? "",
    `/api/share/${shareToken}/sync-token`,
  );

  // Resolve the link → metadata + initial state → ephemeral Y.Doc.
  useEffect(() => {
    let active = true;
    const yDoc = new Y.Doc();

    /** Fetches the canonical state and merges it (idempotent re-apply). */
    const hydrate = async () => {
      const res = await fetch(`/api/share/${shareToken}/state`);
      if (!res.ok) throw new Error(`state fetch failed (${res.status})`);
      const { state } = (await res.json()) as { state: string };
      const bytes = fromBase64(state);
      if (active && bytes.length > 0) applyToDoc(yDoc, bytes);
    };

    (async () => {
      try {
        const res = await fetch(`/api/share/${shareToken}`);
        if (!res.ok) {
          // Log the server's verdict so failures are debuggable in devtools.
          const body = await res.text().catch(() => "");
          console.error(`[share] /api/share/<token> → ${res.status}`, body);
          if (active) setFailure(res.status === 404 ? "invalid" : "error");
          return;
        }
        const { document } = (await res.json()) as { document: SharedDocMeta };
        await hydrate();
        if (!active) return;
        setFailure(null);
        setMeta(document);
        setDoc(yDoc);

        // Slow HTTP fallback so guests aren't frozen if the relay is down.
        pollRef.current = setInterval(() => {
          void hydrate().catch(() => {
            /* transient network issue — next tick retries */
          });
        }, GUEST_POLL_MS);
      } catch (err) {
        console.error("[share] guest load failed:", err);
        if (active) setFailure("error");
      }
    })();

    return () => {
      active = false;
      if (pollRef.current) clearInterval(pollRef.current);
      yDoc.destroy();
      setDoc(null);
      setMeta(null);
    };
  }, [shareToken, attempt]);

  if (failure) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 text-center">
        <p className="text-3xl" aria-hidden>
          {failure === "invalid" ? "🔒" : "⚠️"}
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>
          {failure === "invalid"
            ? MESSAGES.shareLinkInvalid
            : MESSAGES.genericErrorHelp}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {failure === "error" && (
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {ACTIONS.tryAgain}
            </button>
          )}
          <Link
            href="/"
            className="text-sm text-[var(--accent)] underline underline-offset-2"
          >
            {ACTIONS.signInToContinue}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1">
      {/* Guest header: title + shared/read-only context + live indicator. */}
      <header
        className="border-b px-4 py-3"
        style={{
          borderColor: "var(--border)",
          backgroundImage:
            "linear-gradient(180deg, color-mix(in srgb, var(--surface) 70%, transparent), transparent)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display truncate text-lg font-semibold">
                {meta?.title ?? MESSAGES.loading}
              </h1>
              <span className="chip text-[var(--muted)]">
                {LABELS.readOnly}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">{MESSAGES.guestBanner}</p>
          </div>

          <div className="flex items-center gap-2">
            {liveStatus !== "disabled" && (
              <span
                className="chip"
                title={
                  liveStatus === "connected"
                    ? "Live — updates appear as collaborators type"
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
            {/* Invite guests to get their own account for editing. */}
            <Link
              href="/signin"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              {ACTIONS.signIn}
            </Link>
          </div>
        </div>
      </header>

      {doc && meta ? (
        <Editor
          doc={doc}
          documentId={meta.id}
          online={false} // guests never get AI or write paths
          editable={false}
          renderToolbar={() => null} // never called when read-only
        />
      ) : (
        <div
          className="mx-auto w-full max-w-3xl px-4 py-12 text-sm text-[var(--muted)]"
          aria-busy="true"
        >
          {MESSAGES.loading}
        </div>
      )}
    </main>
  );
}
