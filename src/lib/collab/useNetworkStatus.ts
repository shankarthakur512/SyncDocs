"use client";

import { useEffect, useState } from "react";

/**
 * Tracks REAL connectivity to the backend — not just `navigator.onLine`.
 *
 * `navigator.onLine` only reports whether a network interface is up; it stays
 * `true` on a Wi-Fi/LAN with no actual internet, which made the status badge
 * wrongly show "Online". To be accurate we additionally probe a tiny same-origin
 * endpoint (`/api/health`). The service worker never caches `/api/*`, so the
 * probe always hits the network and gives an honest answer.
 *
 * Signal logic:
 *  - `navigator.onLine === false`  → definitely offline (fast negative).
 *  - otherwise confirm with a short, aborts-on-timeout fetch to /api/health.
 * We re-check on the browser's online/offline events, on tab focus, and on a
 * periodic interval.
 */

const HEALTH_URL = "/api/health";
const PROBE_INTERVAL_MS = 12_000;
const PROBE_TIMEOUT_MS = 4_000;

export function useNetworkStatus(): boolean {
  // Default optimistic to avoid an offline flash during hydration.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    /** Probe the backend; updates state with the true reachability. */
    const check = async () => {
      // Fast path: the OS says the interface is down → certainly offline.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (active) setOnline(false);
        return;
      }
      // Confirm with a real request, bounded by a timeout.
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        const res = await fetch(`${HEALTH_URL}?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (active) setOnline(res.ok);
      } catch {
        if (active) setOnline(false); // network error / timeout → offline
      } finally {
        clearTimeout(t);
      }
    };

    void check(); // initial

    // React immediately to browser events, then verify with a probe.
    const onChange = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    document.addEventListener("visibilitychange", onVisible);
    timer = setInterval(() => void check(), PROBE_INTERVAL_MS);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return online;
}
