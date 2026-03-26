/* Muon Noi SW v1 - minimal safe cache */
const MN_CACHE = "mn-app-shell-v1";
const CORE = ["/", "/manifest.json", "/assets/ui.css?v=1.0.2", "/assets/ui.js?v=1.0.2"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(MN_CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== MN_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (new URL(req.url).origin === self.location.origin) {
            caches.open(MN_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("/"));
    })
  );
});
