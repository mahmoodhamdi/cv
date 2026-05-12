const CACHE_NAME = 'mahmoud-cv-1339bdfa';
const ASSETS = [
  './',
  './404.html',
  './about.html',
  './assets/apple-touch-icon.png',
  './assets/favicon-16.png',
  './assets/favicon-32.png',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-192.svg',
  './assets/icon-512.png',
  './assets/icon-512.svg',
  './blog/blog.css',
  './blog/index.html',
  './blog/posts/ai-chatbot-business-guide.html',
  './blog/posts/api-integration-beginners.html',
  './blog/posts/building-salla-bot.html',
  './blog/posts/cybersecurity-basics-arabic.html',
  './blog/posts/docker-deployment-guide.html',
  './blog/posts/ecommerce-arabic-market-2026.html',
  './blog/posts/flutter-app-from-scratch.html',
  './blog/posts/flutter-clean-architecture.html',
  './blog/posts/freelancing-pricing-arabic.html',
  './blog/posts/github-portfolio-developer.html',
  './blog/posts/mena-freelance-guide.html',
  './blog/posts/mobile-app-cost-guide.html',
  './blog/posts/mongodb-vs-postgresql.html',
  './blog/posts/nextjs-arabic-website.html',
  './blog/posts/nodejs-rest-api-complete-guide.html',
  './blog/posts/nodejs-typescript-best-practices.html',
  './blog/posts/open-source-contributions-journey.html',
  './blog/posts/payment-integration-mena.html',
  './blog/posts/react-dashboard-tutorial.html',
  './blog/posts/saas-mvp-build-guide.html',
  './blog/posts/salla-store-automation.html',
  './blog/posts/telegram-bot-nodejs-tutorial.html',
  './blog/posts/website-speed-optimization.html',
  './blog/posts/whatsapp-business-bot-guide.html',
  './blog/posts/zid-vs-salla-comparison.html',
  './blog/tag/experience/index.html',
  './blog/tag/guide/index.html',
  './blog/tag/tutorial/index.html',
  './changelog.html',
  './css/bundle.css',
  './css/sections.css',
  './css/utilities.css',
  './data/search-index.json',
  './data/stats.json',
  './index.html',
  './js/analytics.js',
  './js/animations.js',
  './js/blog-enhance.js',
  './js/contact.js',
  './js/github-stats.js',
  './js/language.js',
  './js/main.js',
  './js/navigation.js',
  './js/pwa.js',
  './js/search.js',
  './js/theme.js',
  './js/utils.js',
  './manifest.json',
  './privacy.html',
  './projects/bagour-delivery.html',
  './projects/clinic-booking.html',
  './projects/escore.html',
  './projects/hadith-app.html',
  './projects/iai-salla-bot.html',
  './projects/index.html',
  './projects/projects.css',
  './projects/sana3y.html',
  './projects/wasalni.html',
  './projects/whatsapp-bot.html',
  './resume.json',
  './services.html',
  './stats.html',
  './uses.html'
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
