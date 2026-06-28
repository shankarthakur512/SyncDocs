/*
 * Service worker — makes the app shell available offline.
 *
 * WHY: the local-first data lives in IndexedDB, but a hard refresh while offline
 * still needs the HTML/JS/CSS, which normally come from the network. This worker
 * caches those so the app reloads and runs offline.
 *
 * STRATEGY
 *  - Static assets (/_next/static, fonts, images): cache-first (they're hashed
 *    and immutable, so a cached copy is always valid).
 *  - Navigations (HTML): network-first, falling back to the cached page (and
 *    finally the cached root shell) when offline. Network-first means you always
 *    get fresh content when online — no staleness.
 *  - API requests (/api/*) are never cached; the app already handles their
 *    failure gracefully with its own offline fallbacks.
 */

const SHELL_CACHE = "syncdocs-shell-v1";
const ASSET_CACHE = "syncdocs-assets-v1";

self.addEventListener("install", () => {
  // Activate this worker as soon as it's installed.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older worker versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only same-origin
  if (url.pathname.startsWith("/api/")) return; // never cache API calls

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|woff2?|png|jpe?g|gif|svg|ico|webp)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  }
});

/** Serve from cache if present; otherwise fetch and cache. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached || Response.error();
  }
}

/** Prefer the network; fall back to the cached page (then root) when offline. */
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const root = await cache.match("/");
    if (root) return root;
    throw new Error("Offline and no cached shell available.");
  }
}
