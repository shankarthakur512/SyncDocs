import { NextResponse } from "next/server";

/**
 * Lightweight liveness endpoint used by the client to confirm REAL connectivity
 * to the backend (more reliable than `navigator.onLine`, which only reports
 * whether a network interface is up — not whether the internet/server is
 * reachable). The service worker never caches `/api/*`, so this always hits the
 * network and gives an honest online/offline signal.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
