/* =============================================
   pwa.js — Service worker registration, install prompt, offline banner, cache update notification
   ============================================= */

(function() {
  'use strict';

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js')
        .then(function(reg) {
          // Check for updates
          reg.addEventListener('updatefound', function() {
            var newWorker = reg.installing;
            newWorker.addEventListener('statechange', function() {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                showUpdateToast();
              }
            });
          });
        })
        .catch(function(err) {
          // SW registration failed silently
        });
    });
  }

  // Cache update notification
  function showUpdateToast() {
    var isAr = document.documentElement.lang === 'ar';
    var toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.innerHTML = '<span>' + (isAr ? 'إصدار جديد متاح!' : 'New version available!') + '</span>' +
      '<button onclick="location.reload()">' + (isAr ? 'تحديث' : 'Refresh') + '</button>' +
      '<button class="pwa-toast-close" onclick="this.parentElement.remove()" aria-label="Close">&times;</button>';
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('vis'); }, 10);
    setTimeout(function() { toast.remove(); }, 10000);
  }

  // Install prompt
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  function showInstallButton() {
    var btns = document.querySelectorAll('.pwa-install-btn');
    btns.forEach(function(btn) {
      btn.style.display = 'inline-flex';
      btn.addEventListener('click', function() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choice) {
          if (choice.outcome === 'accepted') {
            btns.forEach(function(b) {
              b.textContent = '\u2713 Installed!';
              setTimeout(function() { b.style.display = 'none'; }, 2000);
            });
          }
          deferredPrompt = null;
        });
      });
    });
  }

  // Hide install button if already in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.querySelectorAll('.pwa-install-btn').forEach(function(btn) {
      btn.style.display = 'none';
    });
  } else {
    // iOS Safari fallback — beforeinstallprompt never fires there.
    var ua = window.navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    var isStandalone = window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      document.querySelectorAll('.pwa-install-btn').forEach(function(btn) {
        btn.style.display = 'inline-flex';
        btn.addEventListener('click', function() {
          var isAr = document.documentElement.lang === 'ar';
          var msg = isAr
            ? 'لتثبيت التطبيق: اضغط زر المشاركة ⬆ ثم اختر "إضافة إلى الشاشة الرئيسية"'
            : 'To install: tap Share ⬆ then "Add to Home Screen"';
          if (window.showToast) window.showToast(msg);
          else alert(msg);
        });
      });
    }
  }

  // Offline banner
  function checkOnline() {
    var banner = document.getElementById('offline-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.className = 'offline-banner';
      var isAr = document.documentElement.lang === 'ar';
      banner.innerHTML = '<span>' + (isAr ? 'أنت غير متصل — يتم عرض المحتوى المخزن' : "You're offline — viewing cached content") + '</span>' +
        '<button onclick="this.parentElement.style.display=\'none\'" aria-label="Dismiss">&times;</button>';
      document.body.prepend(banner);
    }
    if (!navigator.onLine) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  window.addEventListener('online', checkOnline);
  window.addEventListener('offline', checkOnline);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { if (!navigator.onLine) checkOnline(); });
  } else {
    if (!navigator.onLine) checkOnline();
  }
})();
