import type { Role } from "@/lib/api/client";
import { ROLES } from "@/lib/constants/strings";

/**
 * Per-role visual styling (redesign spec): Owner = warm amber (presence hue),
 * Editor = indigo accent, Viewer = quiet gray. Token-based so both themes work.
 */
const ROLE_STYLES: Record<Role, { label: string; bg: string; fg: string }> = {
  OWNER: {
    label: ROLES.OWNER,
    bg: "color-mix(in srgb, var(--warn) 15%, transparent)",
    fg: "var(--warn)",
  },
  EDITOR: {
    label: ROLES.EDITOR,
    bg: "var(--accent-soft)",
    fg: "var(--accent)",
  },
  VIEWER: {
    label: ROLES.VIEWER,
    bg: "rgba(127, 127, 127, 0.14)",
    fg: "var(--muted)",
  },
};

/**
 * Small pill showing a user's role on a document. Used in the document list,
 * the editor header, and the collaborators panel for consistency.
 */
export default function RoleBadge({ role }: { role: Role }) {
  const s = ROLE_STYLES[role];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
