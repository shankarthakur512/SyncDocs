"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (see /public/sw.js) so the app shell works
 * offline, including after a hard refresh.
 *
 * Skipped on localhost: in development, Next.js serves un-hashed, frequently
 * changing assets, and an aggressive cache would serve stale files. We also
 * proactively unregister any worker there to avoid dev caching surprises.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      // Ensure no stale dev worker lingers.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    // Register after load so it never competes with first paint.
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal; the app still works online.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
