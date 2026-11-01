// OnRoute service worker: permite instalar la app y abrirla aunque falle la red.
// Los pedidos, el mapa y Firebase siempre van por internet (no se guardan aquí).
const CACHE = "onroute-v27";
const SHELL = ["./", "index.html", "css/app.css", "js/app.js", "firebase-config.js", "favicon.svg", "icon-192.png", "icon-512.png", "manifest.webmanifest",
  "vendor/leaflet.js", "vendor/leaflet.css", "vendor/qrcode.js", "vendor/firebase-app-compat.js", "vendor/firebase-app-check-compat.js", "vendor/firebase-auth-compat.js", "vendor/firebase-firestore-compat.js", "vendor/firebase-storage-compat.js"];

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

// Al tocar la notificación de "pedido listo": abre (o enfoca) la página del pedido.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const same = list.find(c => c.url.split("#")[0].startsWith(url.split("#")[0]));
    if (same) return same.focus();
    if (list[0]) return list[0].focus().then(c => c && c.navigate ? c.navigate(url) : null);
    return self.clients.openWindow(url);
  }));
});
