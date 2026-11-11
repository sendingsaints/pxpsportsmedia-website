
/* PxP Sports Media — service worker (v8).
   App shell is precached; pages are network-first with a cache fallback;
   static assets are cache-first. Cross-origin requests (the ESPN
   live-scores feed above all) are NEVER intercepted or cached — the
   scores must always be live. */
var CACHE = "pxp-shell-v87";
var SHELL = [
  "/",
  "/assets/css/style.css",
  "/assets/js/scores.js",
  "/assets/js/odds.js",
  "/assets/js/injuries.js",
  "/assets/js/standings.js",
  "/assets/js/scoreboards.js",
  "/assets/js/leaders.js",
  "/assets/js/news.js",
  "/assets/js/pwa.js",
  "/manifest.webmanifest",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/maskable-512.png",
  "/assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;  /* ESPN etc.: hands off */
  if (e.request.method !== "GET") return;
  if (e.request.mode === "navigate") {
    /* pages: network-first, cache fallback (home page as last resort) */
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("/");
        });
      })
    );
    return;
  }
  /* static assets: cache-first, refreshed from the network in parallel */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
