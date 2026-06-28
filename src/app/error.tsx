"use client";

import { useEffect } from "react";
import { ACTIONS, MESSAGES } from "@/lib/constants/strings";

/**
 * Route-segment error boundary.
 *
 * Replaces React's default "something went wrong" with a friendly, themed
 * fallback that offers a retry. Most offline cases are handled gracefully before
 * reaching here (see DocShell's local-first fallback); this is the safety net
 * for anything unexpected.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for diagnostics; never surface raw internals to the user.
    console.error("[route-error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">{MESSAGES.genericError}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {MESSAGES.genericErrorHelp}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {ACTIONS.tryAgain}
      </button>
    </main>
  );
}
