"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Sparkles,
  Square,
  SquareCode,
  Strikethrough,
  TextQuote,
  Undo2,
} from "lucide-react";
import type { AiControls } from "./Editor";
import { ACTIONS } from "@/lib/constants/strings";

interface EditorToolbarProps {
  editor: Editor | null;
  /** Opens the OS file picker to insert an image. */
  onAddImage: () => void;
  /** AI "continue writing" controls (run/stop/busy/enabled). */
  ai?: AiControls;
}

/** Shared icon sizing — 16px reads crisply at the 32px button size. */
const ICON = { size: 16, strokeWidth: 2 } as const;

/** A single toolbar button with active-state + accessibility wiring. */
function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--foreground)] hover:bg-[rgba(127,127,127,0.12)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Visual separator between button groups. */
function Divider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-5 w-px self-center"
      style={{ backgroundColor: "var(--border)" }}
    />
  );
}

/**
 * Formatting toolbar. Stateless: it reflects and mutates the editor passed in.
 * Buttons are disabled until the editor is ready to prevent null-access errors.
 * Sticky so formatting stays reachable while scrolling long documents.
 */
export default function EditorToolbar({
  editor,
  onAddImage,
  ai,
}: EditorToolbarProps) {
  const ready = !!editor;

  return (
    <div
      className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      role="toolbar"
      aria-label="Formatting"
    >
      {/* Inline marks */}
      <ToolbarButton
        label="Bold (Ctrl+B)"
        active={editor?.isActive("bold")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Italic (Ctrl+I)"
        active={editor?.isActive("italic")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor?.isActive("strike")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={editor?.isActive("code")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      >
        <Code {...ICON} />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        label="Heading 1"
        active={editor?.isActive("heading", { level: 1 })}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor?.isActive("heading", { level: 2 })}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor?.isActive("heading", { level: 3 })}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 {...ICON} />
      </ToolbarButton>

      <Divider />

      {/* Blocks */}
      <ToolbarButton
        label="Bullet list"
        active={editor?.isActive("bulletList")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor?.isActive("orderedList")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor?.isActive("blockquote")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <TextQuote {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor?.isActive("codeBlock")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      >
        <SquareCode {...ICON} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Insert image" disabled={!ready} onClick={onAddImage}>
        <ImagePlus {...ICON} />
      </ToolbarButton>

      <Divider />

      {/* History */}
      <ToolbarButton
        label="Undo (Ctrl+Z)"
        disabled={!ready || !editor?.can().undo()}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Undo2 {...ICON} />
      </ToolbarButton>
      <ToolbarButton
        label="Redo (Ctrl+Shift+Z)"
        disabled={!ready || !editor?.can().redo()}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Redo2 {...ICON} />
      </ToolbarButton>

      {/* AI: continue writing from the cursor (pushed to the right edge). */}
      {ai && (
        <button
          type="button"
          onClick={ai.busy ? ai.stop : ai.run}
          disabled={!ready || !ai.enabled}
          aria-label={ai.busy ? ACTIONS.aiStop : ACTIONS.aiContinue}
          title={
            ai.enabled
              ? ai.busy
                ? ACTIONS.aiStop
                : ACTIONS.aiContinueHint
              : ACTIONS.aiOfflineHint
          }
          className={[
            // Spec 1c: quiet indigo pill ("+ Continue writing"), not a gradient.
            "ml-auto flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-40",
            ai.busy ? "animate-pulse" : "hover:bg-[var(--accent-soft)]",
          ].join(" ")}
          style={{
            borderColor: "var(--accent)",
            color: "var(--accent)",
            background: ai.busy ? "var(--accent-soft)" : undefined,
          }}
        >
          {ai.busy ? (
            <Square size={12} strokeWidth={2.5} fill="currentColor" />
          ) : (
            <Sparkles size={14} strokeWidth={2} />
          )}
          {ai.busy ? ACTIONS.aiStop : ACTIONS.aiContinue}
        </button>
      )}
    </div>
  );
}
