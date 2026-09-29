/* CampusPilot service worker: makes the app installable and quick to open.
 * - App files (hashed /assets/*) are cached; pages load from the network first
 *   and fall back to the cached app when offline.
 * - API calls (/api/*) and live updates (/ws) are NEVER cached — personal data
 *   always comes fresh from the server and is never stored on the device. */
const CACHE = "campuspilot-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/favicon-32.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/ws" || url.pathname.startsWith("/verify/")) return;

  if (req.mode === "navigate") {           // pages: network first, cached app shell when offline
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put("/", copy));
        return res;
      }).catch(() => caches.match("/"))
    );
    return;
  }
  if (url.pathname.startsWith("/assets/")) { // content-hashed files never change: cache first
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }
  // everything else (config.js, icons, manifest): network first, cache as fallback
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req))
  );
});
