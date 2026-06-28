"use client";

import { useState } from "react";
import {
  ApiError,
  addMember,
  removeMember,
  updateMemberRole,
  type Member,
  type Role,
} from "@/lib/api/client";
import RoleBadge from "./RoleBadge";
import { ACTIONS, LABELS, MESSAGES, ROLES } from "@/lib/constants/strings";

interface CollaboratorsPanelProps {
  documentId: string;
  /** True when the current user is an OWNER (can invite/change/remove). */
  canManage: boolean;
  members: Member[];
  /** Called after a successful change so the parent can re-fetch. */
  onChanged: () => void | Promise<void>;
}

/**
 * Collaborators management panel.
 *
 * Everyone with access sees the collaborator list + roles. OWNERs additionally
 * get controls to invite by email, change roles, and remove members. All
 * mutations go through the RBAC-protected API; server-side errors (e.g. the
 * "must keep one owner" rule) are surfaced inline.
 */
export default function CollaboratorsPanel({
  documentId,
  canManage,
  members,
  onChanged,
}: CollaboratorsPanelProps) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<Role, "OWNER">>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Runs an API mutation with shared loading/error handling + refresh. */
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : MESSAGES.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(async () => {
      await addMember(documentId, email.trim(), inviteRole);
      setEmail("");
    });
  };

  return (
    <section className="px-4 py-4" aria-label={LABELS.collaborators}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>👥</span>
        {LABELS.collaborators}
      </h2>

      {/* Invite form — owners only. */}
      {canManage && (
        <form onSubmit={handleInvite} className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={LABELS.collaboratorEmail}
            aria-label={LABELS.collaboratorEmail}
            className="min-w-[12rem] flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", background: "transparent" }}
          />
          <select
            value={inviteRole}
            onChange={(e) =>
              setInviteRole(e.target.value as Exclude<Role, "OWNER">)
            }
            aria-label="Invite role"
            className="rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <option value="VIEWER">{ROLES.VIEWER}</option>
            <option value="EDITOR">{ROLES.EDITOR}</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {ACTIONS.invite}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {/* Member list. */}
      <ul className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>
        {members.map((m) => (
          <li
            key={m.user.id}
            className="flex items-center justify-between gap-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {m.user.name ?? m.user.email ?? "Unknown user"}
              </p>
              {m.user.email && (
                <p className="truncate text-xs text-[var(--muted)]">
                  {m.user.email}
                </p>
              )}
            </div>

            {canManage ? (
              <div className="flex items-center gap-2">
                {/* Role selector — server enforces the "keep ≥1 owner" rule. */}
                <select
                  value={m.role}
                  disabled={busy}
                  aria-label={`Role for ${m.user.email ?? m.user.id}`}
                  onChange={(e) =>
                    run(() =>
                      updateMemberRole(
                        documentId,
                        m.user.id,
                        e.target.value as Role,
                      ),
                    )
                  }
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <option value="OWNER">{ROLES.OWNER}</option>
                  <option value="EDITOR">{ROLES.EDITOR}</option>
                  <option value="VIEWER">{ROLES.VIEWER}</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() => removeMember(documentId, m.user.id))
                  }
                  aria-label={`Remove ${m.user.email ?? m.user.id}`}
                  className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  {ACTIONS.remove}
                </button>
              </div>
            ) : (
              <RoleBadge role={m.role} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
