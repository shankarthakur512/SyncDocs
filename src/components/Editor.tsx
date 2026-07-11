"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { fileToDataUrl } from "@/lib/image";
import { streamContinuation } from "@/lib/ai/client";
import { ApiError } from "@/lib/api/client";
import { ACTIONS, LABELS, MESSAGES } from "@/lib/constants/strings";

/** AI controls exposed to the toolbar. */
export interface AiControls {
  /** A generation is currently streaming into the document. */
  busy: boolean;
  /** False when offline or the document id is unknown (button disabled). */
  enabled: boolean;
  /** Start streaming a continuation from the cursor position. */
  run: () => void;
  /** Cancel the in-flight generation. */
  stop: () => void;
}

interface EditorProps {
  /** The shared Yjs document this editor binds to. */
  doc: Y.Doc;
  /** Server id of the document — required for AI calls (RBAC-checked). */
  documentId: string;
  /** Network status; AI is disabled offline (everything else keeps working). */
  online: boolean;
  /**
   * Whether the current user may edit. VIEWERs get `false`, which makes the
   * editor read-only and hides the formatting toolbar — the client-side
   * reflection of the RBAC rule that viewers cannot mutate the document.
   */
  editable: boolean;
  /** Toolbar is rendered by the parent so it can sit above the page scroll. */
  renderToolbar: (ctx: {
    editor: TiptapEditor | null;
    onAddImage: () => void;
    ai: AiControls;
  }) => React.ReactNode;
}

/**
 * The rich-text editor, bound to a Yjs document.
 *
* This is the main editing surface for a document. It is read-only for VIEWERs and editable for OWNERs/EDITORs. The formatting toolbar is rendered by the parent so it can sit above the page scroll.   
*
 */
export default function Editor({
  doc,
  documentId,
  online,
  editable,
  renderToolbar,
}: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // AI "continue writing" state: one generation at a time, abortable.
  const [aiBusy, setAiBusy] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    // Read-only for viewers; editable for owners/editors.
    editable,
    extensions: [
      StarterKit.configure({
        // Disable StarterKit's history; Collaboration owns undo/redo.
        undoRedo: false,
      }),
      // Bind the editor to the CRDT document. This is what makes edits
      // conflict-free and (in Phase 2) mergeable across peers.
      Collaboration.configure({ document: doc }),
      Image.configure({
        inline: false,
        allowBase64: true, // Phase 1: images stored inline as data URLs.
      }),
      Placeholder.configure({
        placeholder: MESSAGES.editorPlaceholder,
      }),
    ],
    editorProps: {
      attributes: {
        // Accessibility + layout for the editable surface.
        class: "ProseMirror focus:outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": LABELS.documentBody,
      },
      // Allow pasting/dropping images directly into the document.
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          void insertImageFiles(Array.from(files));
          return true; // handled
        }
        return false;
      },
      handleDrop(view, event) {
        const files = (event as DragEvent).dataTransfer?.files;
        if (files && files.length > 0) {
          void insertImageFiles(Array.from(files));
          return true; // handled
        }
        return false;
      },
    },
  });

  // Keep the editor's editable flag in sync if the user's role changes at runtime.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  /** Reads image files and inserts them, surfacing validation errors. */
  const insertImageFiles = useCallback(
    async (files: File[]) => {
      if (!editor || !editable) return; // viewers cannot insert images
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const result = await fileToDataUrl(file);
        if (result.ok && result.dataUrl) {
          editor.chain().focus().setImage({ src: result.dataUrl }).run();
        } else {
          setError(result.error ?? "Could not insert image.");
        }
      }
    },
    [editor, editable],
  );

  /** Opens the file picker from the toolbar button. */
  const handleAddImage = useCallback(() => fileInputRef.current?.click(), []);

  /**
   * AI CONTINUE WRITING — streams a Gemini continuation into the editor.
   *
   * The plain text BEFORE the cursor is sent as context; tokens are inserted at
   * the (moving) cursor as they arrive, so the user watches the text grow in
   * place. Inserts are ordinary editor transactions, which means they flow
   * through the same Yjs pipeline as typing: persisted to IndexedDB, synced to
   * the server, broadcast live to collaborators — and undoable with Ctrl+Z.
   */
  const handleAiRun = useCallback(async () => {
    if (!editor || !editable || aiBusy || !online) return;

    // Context = everything before the caret (block-separated), tail-capped
    // server-side. Using the caret (not doc end) lets users continue mid-doc.
    const cursor = editor.state.selection.to;
    const context = editor.state.doc.textBetween(0, cursor, "\n");

    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiBusy(true);
    setError(null);
    try {
      let received = false;
      for await (const chunk of streamContinuation(
        documentId,
        context,
        controller.signal,
      )) {
        received = true;
        // Insert at the current selection; TipTap advances the caret, so
        // consecutive chunks append in order.
        editor.chain().focus().insertContent(chunk).run();
      }
      // The AI SDK masks generation errors (bad key/model/quota) as an EMPTY
      // 200 stream — surface that as a visible failure instead of silence.
      if (!received && !controller.signal.aborted) {
        setError(MESSAGES.aiFailed);
      }
    } catch (err) {
      // A user-initiated stop is not an error.
      if (!controller.signal.aborted) {
        setError(err instanceof ApiError ? err.message : MESSAGES.aiFailed);
      }
    } finally {
      setAiBusy(false);
      aiAbortRef.current = null;
    }
  }, [editor, editable, aiBusy, online, documentId]);

  /** Cancels the in-flight generation (client abort closes the stream). */
  const handleAiStop = useCallback(() => aiAbortRef.current?.abort(), []);

  // Abort any streaming generation when the editor unmounts.
  useEffect(() => () => aiAbortRef.current?.abort(), []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* Hidden input drives the toolbar's "Insert image" action. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files;
          if (files) void insertImageFiles(Array.from(files));
          e.target.value = ""; // reset so the same file can be picked again
        }}
      />

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", color: "var(--danger)" }}
        >
          {error}{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setError(null)}
          >
            {ACTIONS.dismiss}
          </button>
        </div>
      )}

      {/* The bounded "page": a sheet-of-paper panel holding the toolbar and the
          editable area, sitting on the muted app canvas. */}
      {/* `overflow-clip` (not `overflow-hidden`) keeps rounded corners without
          creating a scroll container — required for the sticky toolbar.
          shadow-md + generous inner padding = "sheet of paper" on the canvas. */}
      <div
        className="overflow-clip rounded-xl border shadow-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {editable ? (
          renderToolbar({
            editor,
            onAddImage: handleAddImage,
            ai: {
              busy: aiBusy,
              enabled: online && !!documentId,
              run: () => void handleAiRun(),
              stop: handleAiStop,
            },
          })
        ) : (
          // Read-only banner shown to viewers instead of the toolbar.
          <div
            className="border-b px-4 py-2 text-xs font-medium text-[var(--muted)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            role="note"
          >
            {LABELS.viewOnlyBanner}
          </div>
        )}
        <div
          className="min-h-[75vh] cursor-text px-6 py-8 sm:px-14 sm:py-12"
          // Clicking anywhere on the page focuses the editor at the end — the
          // whole sheet behaves like paper, not just the typed lines.
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              editor?.chain().focus("end").run();
            }
          }}
        >
          {/* `editor` is null only on the very first render before useEditor
              initialises; guarding keeps the prop strictly typed. */}
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  );
}
