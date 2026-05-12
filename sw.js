const CACHE_NAME = 'mahmoud-cv-v10';
const ASSETS = [
  './',
  './index.html',
  './about.html',
  './services.html',
  './css/bundle.css',
  './css/sections.css',
  './css/utilities.css',
  './js/main.js',
  './js/utils.js',
  './js/theme.js',
  './js/language.js',
  './js/navigation.js',
  './js/animations.js',
  './js/analytics.js',
  './js/contact.js',
  './js/pwa.js',
  './js/github-stats.js',
  './data/stats.json',
  './assets/favicon.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './manifest.json',
  './projects/projects.css',
  './projects/escore.html',
  './projects/iai-salla-bot.html',
  './projects/wasalni.html',
  './projects/hadith-app.html',
  './projects/clinic-booking.html',
  './projects/whatsapp-bot.html',
  './projects/bagour-delivery.html',
  './projects/sana3y.html',
  './blog/index.html',
  './blog/blog.css',
  './blog/posts/building-salla-bot.html',
  './blog/posts/flutter-clean-architecture.html',
  './blog/posts/nodejs-typescript-best-practices.html',
  './blog/posts/open-source-contributions-journey.html',
  './blog/posts/mena-freelance-guide.html',
  './blog/posts/salla-store-automation.html',
  './blog/posts/zid-vs-salla-comparison.html',
  './blog/posts/whatsapp-business-bot-guide.html',
  './blog/posts/telegram-bot-nodejs-tutorial.html',
  './blog/posts/nextjs-arabic-website.html',
  './blog/posts/flutter-app-from-scratch.html',
  './blog/posts/nodejs-rest-api-complete-guide.html',
  './blog/posts/react-dashboard-tutorial.html',
  './blog/posts/mongodb-vs-postgresql.html',
  './blog/posts/docker-deployment-guide.html',
  './blog/posts/freelancing-pricing-arabic.html',
  './blog/posts/ecommerce-arabic-market-2026.html',
  './blog/posts/ai-chatbot-business-guide.html',
  './blog/posts/payment-integration-mena.html',
  './blog/posts/mobile-app-cost-guide.html',
  './blog/posts/website-speed-optimization.html',
  './blog/posts/github-portfolio-developer.html',
  './blog/posts/saas-mvp-build-guide.html',
  './blog/posts/api-integration-beginners.html',
  './blog/posts/cybersecurity-basics-arabic.html',
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
