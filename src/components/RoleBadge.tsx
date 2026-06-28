import type { Role } from "@/lib/api/client";
import { ROLES } from "@/lib/constants/strings";

/** Per-role visual styling. Colors are theme-independent, readable in both modes. */
const ROLE_STYLES: Record<Role, { label: string; bg: string; fg: string }> = {
  OWNER: { label: ROLES.OWNER, bg: "rgba(37, 99, 235, 0.15)", fg: "#2563eb" },
  EDITOR: { label: ROLES.EDITOR, bg: "rgba(22, 163, 74, 0.15)", fg: "#16a34a" },
  VIEWER: { label: ROLES.VIEWER, bg: "rgba(107, 114, 128, 0.18)", fg: "#6b7280" },
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
