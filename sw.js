const CACHE_NAME = 'mahmoud-cv-v2';
const ASSETS = [
  './',
  './index.html',
  './css/bundle.css',
  './css/sections.css',
  './css/utilities.css',
  './css/print.css',
  './js/main.js',
  './js/utils.js',
  './js/theme.js',
  './js/language.js',
  './js/navigation.js',
  './js/animations.js',
  './js/analytics.js',
  './assets/favicon.svg',
  './blog/index.html',
  './blog/blog.css',
  './404.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(ASSETS); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(cached) {
        return cached || fetch(event.request)
          .then(function(response) {
            if (response.ok && event.request.url.startsWith(self.location.origin)) {
              var clone = response.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, clone);
              });
            }
            return response;
          });
      })
      .catch(function() { return caches.match('./404.html'); })
  );
});
