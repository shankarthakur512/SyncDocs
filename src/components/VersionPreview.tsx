"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { fetchVersionState } from "@/lib/versioning/client";
import { docFromState, fromBase64 } from "@/lib/versioning/crdt";
import { ApiError } from "@/lib/api/client";
import { ACTIONS, FORMAT, LABELS, MESSAGES } from "@/lib/constants/strings";
import { Z_INDEX } from "@/lib/constants/ui";

interface VersionPreviewProps {
  documentId: string;
  versionId: string;
  label: string;
  /** Writers can restore directly from the preview. */
  canRestore: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => void | Promise<void>;
}

/**
 * Read-only renderer for a loaded version document. Kept as an inner component
 * so `useEditor` always receives a non-null doc (hooks must run unconditionally).
 */
function PreviewEditor({ doc }: { doc: Y.Doc }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false, // time-travel preview is never editable
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: doc }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    editorProps: {
      attributes: { class: "ProseMirror", "aria-label": "Version preview" },
    },
  });

  return <div className="px-2 py-2">{editor && <EditorContent editor={editor} />}</div>;
}

/**
 * Modal overlay that shows a document AS IT WAS at a given version.
 *
 * It fetches the version's full encoded state, rebuilds a throwaway Y.Doc, and
 * renders it read-only — the live document is never touched. Writers can trigger
 * a (non-destructive) restore from here.
 */
export default function VersionPreview({
  documentId,
  versionId,
  label,
  canRestore,
  onClose,
  onRestore,
}: VersionPreviewProps) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Portals need a DOM target; only render after mount (avoids SSR mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Load the version state into a temporary doc; destroy it on cleanup.
  useEffect(() => {
    let active = true;
    let created: Y.Doc | null = null;

    fetchVersionState(documentId, versionId)
      .then(({ state }) => {
        if (!active) return;
        created = docFromState(fromBase64(state));
        setDoc(created);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load version.",
          );
        }
      });

    return () => {
      active = false;
      created?.destroy();
    };
  }, [documentId, versionId]);

  if (!mounted) return null;

  // Rendered via a portal to <body> so the overlay escapes the sticky sidebar's
  // stacking context — otherwise the Collaborators sidebar could paint over it.
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.overlay }}
      role="dialog"
      aria-modal="true"
      aria-label={FORMAT.previewTitle(label)}
      onClick={onClose}
    >
      {/* Stop propagation so clicks inside the panel don't close it. */}
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">
              {FORMAT.previewTitle(label)}
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {LABELS.previewSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canRestore && (
              <button
                type="button"
                onClick={() => onRestore(versionId)}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                {ACTIONS.restoreThisVersion}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[rgba(127,127,127,0.12)]"
              style={{ borderColor: "var(--border)" }}
            >
              {ACTIONS.close}
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          {error ? (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          ) : doc ? (
            <PreviewEditor doc={doc} />
          ) : (
            <p className="text-sm text-[var(--muted)]">{MESSAGES.loading}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
