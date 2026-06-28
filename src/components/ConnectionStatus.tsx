"use client";

import type { SyncStatus } from "@/lib/collab/types";
import { MESSAGES } from "@/lib/constants/strings";

interface ConnectionStatusProps {
  /** Browser network state. */
  online: boolean;
  /** Local persistence / sync state. */
  status: SyncStatus;
}

/**
 * Compact, accessible status badge.
 *
 * It communicates two independent facts the user cares about:
 *  1) Is my work saved locally? (derived from `status`)
 *  2) Am I connected to the network? (`online`)
 *
 * `role="status"` + `aria-live` announce changes to screen readers.
 */
export default function ConnectionStatus({ online, status }: ConnectionStatusProps) {
  // Local persistence is the headline message in Phase 1.
  const localSaved = status === "local-ready";

  const label = !localSaved
    ? MESSAGES.loading
    : online
      ? MESSAGES.savedLocalOnline
      : MESSAGES.savedLocalOffline;

  const dotColor = !localSaved
    ? "#9ca3af" // gray: initializing
    : online
      ? "#16a34a" // green: online
      : "#f59e0b"; // amber: offline but safe locally

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{ borderColor: "var(--border)" }}
      title={
        online
          ? "Your changes are stored on this device and the network is available."
          : "You are offline. Your changes are safely stored on this device and will sync when you reconnect."
      }
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      {label}
    </div>
  );
}
