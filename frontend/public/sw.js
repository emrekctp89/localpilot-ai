/* LocalPilot AI — lightweight PWA service worker */
const CACHE_VERSION = "localpilot-v1";
const PRECACHE = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API or auth-sensitive dashboard data aggressively
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/dashboard")
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline");
        return offline || new Response("Çevrimdışı", { status: 503 });
      }),
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void caches.open(CACHE_VERSION).then((cache) => {
              void cache.put(request, clone);
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // Navigations: network-first, offline offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => {
            void cache.put(request, clone);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          return offline || new Response("Çevrimdışı", { status: 503 });
        }),
    );
  }
});
