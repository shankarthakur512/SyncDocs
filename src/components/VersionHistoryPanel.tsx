"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchVersions,
  restoreVersion as apiRestoreVersion,
} from "@/lib/versioning/client";
import type { VersionMeta } from "@/lib/versioning/types";
import { ApiError } from "@/lib/api/client";
import {
  ACTIONS,
  FORMAT,
  LABELS,
  MESSAGES,
  VERSION_KINDS,
} from "@/lib/constants/strings";
import VersionPreview from "./VersionPreview";

interface VersionHistoryPanelProps {
  documentId: string;
  /** Owners/editors can save + restore; viewers see history read-only. */
  canWrite: boolean;
  /** From the sync engine: flushes local edits then snapshots the server state. */
  saveManualVersion: (label?: string) => Promise<VersionMeta | null>;
  /** Called after a restore so the parent can pull the new state + refresh. */
  onRestored: () => void | Promise<void>;
}

/**
 * Version history timeline.
 *
 * Lists snapshots newest-first and (for writers) offers "Save version" and
 * "Restore". Restore is non-destructive on the server (it auto-snapshots the
 * current state first), and afterwards we ask the parent to pull the new state
 * into the live editor.
 */
export default function VersionHistoryPanel({
  documentId,
  canWrite,
  saveManualVersion,
  onRestored,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The version currently open in the read-only preview overlay, if any.
  const [preview, setPreview] = useState<VersionMeta | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { versions } = await fetchVersions(documentId);
      setVersions(versions);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : MESSAGES.loadHistoryFailed,
      );
    }
  }, [documentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveManualVersion(label.trim() || undefined);
      setLabel("");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : MESSAGES.saveVersionFailed,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiRestoreVersion(documentId, versionId);
      setPreview(null); // close the preview overlay if open
      await onRestored(); // parent pulls the reverted state into the live editor
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : MESSAGES.restoreFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="px-4 py-4" aria-label={LABELS.versionHistory}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>🕑</span>
        {LABELS.versionHistory}
      </h2>

      {canWrite && (
        <form onSubmit={handleSave} className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={LABELS.versionLabel}
            aria-label={LABELS.versionLabel}
            maxLength={200}
            className="min-w-[12rem] flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", background: "transparent" }}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? ACTIONS.saving : ACTIONS.saveVersion}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>
        {versions.length === 0 ? (
          <li className="py-2 text-sm text-[var(--muted)]">
            {MESSAGES.noVersions}
          </li>
        ) : (
          versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{v.label ?? LABELS.snapshot}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{
                      backgroundColor:
                        v.kind === "MANUAL"
                          ? "var(--accent-soft)"
                          : "rgba(107, 114, 128, 0.18)",
                      color: v.kind === "MANUAL" ? "#2563eb" : "#6b7280",
                    }}
                  >
                    {v.kind === "MANUAL" ? VERSION_KINDS.MANUAL : VERSION_KINDS.AUTO}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {FORMAT.updatedAt(v.createdAt).replace("Updated ", "")}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {/* Preview is available to everyone (read-only time travel). */}
                <button
                  type="button"
                  onClick={() => setPreview(v)}
                  className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {ACTIONS.preview}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRestore(v.id)}
                    className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-50"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {ACTIONS.restore}
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Read-only time-travel overlay. */}
      {preview && (
        <VersionPreview
          documentId={documentId}
          versionId={preview.id}
          label={preview.label ?? LABELS.snapshot}
          canRestore={canWrite}
          onClose={() => setPreview(null)}
          onRestore={handleRestore}
        />
      )}
    </section>
  );
}
