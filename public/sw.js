// Offline support. Vite hashes /assets/* filenames, so those are immutable and
// served cache-first. Everything else (HTML, manifest, icons) keeps a stable URL,
// so it is network-first: otherwise a changed manifest would never reach the
// installed app.
const CACHE = "monster-meter-v2";
const SHELL = ["/", "/manifest.webmanifest", "/favicon-32.png", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      // Precache the entry bundle referenced by the current index.html, so the
      // app works offline even if the first visit happened before the SW took over.
      const html = await (await cache.match("/")).text();
      const assets = [...html.matchAll(/["'](\/assets\/[^"']+)["']/g)].map((m) => m[1]);
      await cache.addAll(assets);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (!url.pathname.startsWith("/assets/")) {
    // All navigations share one cached shell, since the app is a single page.
    const key = req.mode === "navigate" ? "/" : req;
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) (await caches.open(CACHE)).put(key, res.clone());
          return res;
        } catch {
          return (await caches.match(key)) ?? Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })()
  );
});
