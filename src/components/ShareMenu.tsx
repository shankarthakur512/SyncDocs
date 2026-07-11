"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import {
  ApiError,
  disableShareLink,
  enableShareLink,
  getShareToken,
  shareUrlFor,
} from "@/lib/api/client";
import { ACTIONS, MESSAGES } from "@/lib/constants/strings";

interface ShareMenuProps {
  documentId: string;
  /** Only owners may manage sharing; the button is hidden otherwise. */
  canManage: boolean;
}

/**
 * Google-Docs-style "Share" control for the document header.
 *
 * A primary button that opens a small popover with the guest-link controls:
 * create, copy, and revoke. Sharing state is loaded lazily on first open (no
 * wasted request for users who never share). Closes on outside click and Esc.
 */
export default function ShareMenu({ documentId, canManage }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  // undefined = not loaded yet; null = sharing off; string = active token.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Lazy-load the sharing status the first time the popover opens.
  useEffect(() => {
    if (!open || token !== undefined) return;
    let active = true;
    getShareToken(documentId)
      .then(({ token: t }) => active && setToken(t))
      .catch(() => active && setToken(null));
    return () => {
      active = false;
    };
  }, [open, token, documentId]);

  // Dismiss on outside click / Escape — standard popover behaviour.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** Shared busy/error wrapper for the enable/disable mutations. */
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : MESSAGES.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)" }}
      >
        <Link2 size={15} strokeWidth={2.25} aria-hidden />
        {ACTIONS.share}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ACTIONS.shareLink}
          className="absolute right-0 z-20 mt-2 w-80 rounded-xl border p-4 shadow-lg"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h3 className="text-sm font-semibold">{ACTIONS.shareLink}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {token ? MESSAGES.shareLinkHelp : MESSAGES.shareLinkOff}
          </p>

          {error && (
            <p role="alert" className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          {token === undefined ? (
            <p className="mt-3 text-xs text-[var(--muted)]" aria-busy="true">
              {MESSAGES.loading}
            </p>
          ) : token ? (
            <>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrlFor(token)}
                  aria-label={ACTIONS.shareLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs"
                  style={{
                    borderColor: "var(--border)",
                    background: "transparent",
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrlFor(token));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {copied ? ACTIONS.copied : ACTIONS.copyLink}
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await disableShareLink(documentId);
                    setToken(null);
                  })
                }
                className="mt-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-50"
                style={{ borderColor: "var(--border)" }}
              >
                {ACTIONS.disableLink}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const { token: t } = await enableShareLink(documentId);
                  setToken(t);
                })
              }
              className="mt-3 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {ACTIONS.enableLink}
            </button>
          )}

          <p
            className="mt-3 border-t pt-2 text-[11px] text-[var(--muted)]"
            style={{ borderColor: "var(--border)" }}
          >
            {MESSAGES.shareInviteHint}
          </p>
        </div>
      )}
    </div>
  );
}
