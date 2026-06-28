"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { fileToDataUrl } from "@/lib/image";
import { ACTIONS, LABELS, MESSAGES } from "@/lib/constants/strings";

interface EditorProps {
  /** The shared Yjs document this editor binds to. */
  doc: Y.Doc;
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
  }) => React.ReactNode;
}

/**
 * The rich-text editor, bound to a Yjs document.
 *
* This is the main editing surface for a document. It is read-only for VIEWERs and editable for OWNERs/EDITORs. The formatting toolbar is rendered by the parent so it can sit above the page scroll.   
*
 */
export default function Editor({ doc, editable, renderToolbar }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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
          style={{ borderColor: "var(--border)", color: "#b91c1c" }}
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
      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {editable ? (
          renderToolbar({ editor, onAddImage: handleAddImage })
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
        <div className="px-6 py-8 sm:px-10 sm:py-12 min-h-[70vh]">
          {/* `editor` is null only on the very first render before useEditor
              initialises; guarding keeps the prop strictly typed. */}
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  );
}
