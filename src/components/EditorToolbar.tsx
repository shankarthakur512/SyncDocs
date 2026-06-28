"use client";

import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor | null;
  /** Opens the OS file picker to insert an image. */
  onAddImage: () => void;
}

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
        "h-8 min-w-8 px-2 rounded-md text-sm font-medium transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-[var(--accent)] text-white"
          : "hover:bg-[rgba(127,127,127,0.12)]",
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
 */
export default function EditorToolbar({ editor, onAddImage }: EditorToolbarProps) {
  const ready = !!editor;

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b px-2 py-2"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolbarButton
        label="Bold"
        active={editor?.isActive("bold")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor?.isActive("italic")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor?.isActive("strike")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={editor?.isActive("code")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      >
        {"</>"}
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Heading 1"
        active={editor?.isActive("heading", { level: 1 })}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor?.isActive("heading", { level: 2 })}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor?.isActive("heading", { level: 3 })}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={editor?.isActive("bulletList")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor?.isActive("orderedList")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor?.isActive("blockquote")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor?.isActive("codeBlock")}
        disabled={!ready}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      >
        { "{ }" }
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Insert image" disabled={!ready} onClick={onAddImage}>
        🖼 Image
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Undo"
        disabled={!ready || !editor?.can().undo()}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        ↶
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!ready || !editor?.can().redo()}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        ↷
      </ToolbarButton>
    </div>
  );
}
