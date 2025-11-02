const CACHE="cosmic-farm-v1";
const FILES=["./","./index.html","./styles.css","./app.js","./api.js","./telegram-init.js","./manifest.json","./icon192.png","./icon512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
