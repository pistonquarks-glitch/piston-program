self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/admin/") && e.request.method === "GET" && !url.pathname.includes("/admin/events") && !url.pathname.includes("/admin/chat") && !url.pathname.includes("/admin/state")) {
    // network-first for admin shell
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
});
