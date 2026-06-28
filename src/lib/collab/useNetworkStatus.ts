"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the browser's online/offline state.
 *
 * In Phase 1 this drives the connection indicator so the user always knows
 * whether they are working offline. In Phase 2 the same signal will trigger the
 * background sync engine to flush the local change queue on reconnect.
 *
 * Note: `navigator.onLine` is a hint, not a guarantee of server reachability,
 * so Phase 2 will additionally confirm via the WebSocket provider's status.
 */
export function useNetworkStatus(): boolean {
  // Default to `true` to avoid a flash of "offline" during hydration; the
  // effect corrects it immediately on mount.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); // sync with the real value on mount

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
