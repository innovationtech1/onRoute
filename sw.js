// OnRoute service worker: permite instalar la app y abrirla aunque falle la red.
// Los pedidos, el mapa y Firebase siempre van por internet (no se guardan aquí).
const CACHE = "onroute-v4";
const SHELL = ["./", "index.html", "firebase-config.js", "favicon.svg", "icon-192.png", "icon-512.png", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Firebase, mapas y CDNs: directo a internet
  // Primero internet (para tener siempre la versión nueva); si no hay conexión, la copia guardada.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
