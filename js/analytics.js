/* =============================================
   analytics.js — GA4 event tracking + visitor counter
   ============================================= */

(function() {
  'use strict';

  var hostname = window.location.hostname;
  var isLocal = (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '');

  // ─── Core wrapper ───────────────────────────────────────────────────────────

  function trackEvent(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params);
  }

  // ─── Visitor counter (runs in all environments) ───────────────────────────

  function toArabicNumerals(str) {
    var map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
                '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩', ',': '٬' };
    return String(str).replace(/[0-9,]/g, function(c) { return map[c] || c; });
  }

  function initVisitorCounter() {
    var els = document.querySelectorAll('.visitor-count');
    if (!els.length) return;

    var launch = new Date('2026-03-30T00:00:00');
    var now = new Date();
    var days = Math.max(0, Math.floor((now - launch) / 86400000));
    var hour = now.getHours();
    var target = 1000 + (days * 7) + (hour * 3) + Math.floor(Math.random() * 5);

    function formatNum(n, isAr) {
      var s = n.toLocaleString('en-US');
      if (isAr) s = toArabicNumerals(s);
      return s;
    }

    function animateCount(el, from, to, isAr, duration) {
      var start = performance.now();
      function step(ts) {
        var p = Math.min((ts - start) / duration, 1);
        var ease = 1 - Math.pow(1 - p, 3);
        var current = Math.round(from + (to - from) * ease);
        el.textContent = formatNum(current, isAr);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var vcObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = '1';
          var el = entry.target;
          var isAr = el.closest('[id*="ar"]') !== null || document.documentElement.lang === 'ar';
          animateCount(el, target - 15, target, isAr, 1500);
          vcObs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    els.forEach(function(c) { vcObs.observe(c); });
  }

  window.initVisitorCounter = initVisitorCounter;

  // ─── Skip all tracking on localhost ──────────────────────────────────────

  if (isLocal) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVisitorCounter);
    } else {
      initVisitorCounter();
    }
    return;
  }

  // ─── Session state (fire-once guards) ─────────────────────────────────────

  var viewedSections = {};
  var depthsFired = {};
  var timesFired = {};

  // ─── 1. Theme toggle — MutationObserver on data-theme ─────────────────────

  function initThemeTracking() {
    var html = document.documentElement;
    var themeObs = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.attributeName === 'data-theme') {
          var theme = html.getAttribute('data-theme') || 'light';
          trackEvent('theme_switch', { theme: theme });
        }
      });
    });
    themeObs.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ─── 2. Language toggle ────────────────────────────────────────────────────

  function initLangTracking() {
    document.querySelectorAll('.l-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var lang = this.textContent.trim().toLowerCase() === 'en' ? 'en' : 'ar';
        trackEvent('language_switch', { language: lang });
      });
    });
  }

  // ─── 3. Email copy ─────────────────────────────────────────────────────────

  function initCopyTracking() {
    document.querySelectorAll('[data-copy]').forEach(function(el) {
      el.addEventListener('click', function() {
        trackEvent('email_copied');
      });
    });
  }

  // ─── 4 & 5. External link clicks (WhatsApp, GitHub) ───────────────────────

  function initLinkTracking() {
    document.querySelectorAll('a[href]').forEach(function(a) {
      a.addEventListener('click', function() {
        var href = this.getAttribute('href') || '';
        if (href.indexOf('wa.me') !== -1) {
          trackEvent('whatsapp_click');
        } else if (href.indexOf('github.com') !== -1) {
          trackEvent('github_click');
        }
      });
    });
  }

  // ─── 6. CTA button clicks ──────────────────────────────────────────────────

  function initCtaTracking() {
    document.querySelectorAll('.cta .btn-p').forEach(function(btn) {
      btn.addEventListener('click', function() {
        trackEvent('cta_click', { button: 'email' });
      });
    });
    document.querySelectorAll('.cta .btn-o').forEach(function(btn) {
      btn.addEventListener('click', function() {
        trackEvent('cta_click', { button: 'github' });
      });
    });
  }

  // ─── 7. Blog post view ─────────────────────────────────────────────────────

  function initBlogPostTracking() {
    // Only fires on blog post pages (og:type === article)
    var ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType || ogType.getAttribute('content') !== 'article') return;

    var titleEl = document.querySelector('meta[property="og:title"]');
    var postTitle = titleEl ? titleEl.getAttribute('content') : document.title;

    // Derive category from .post-cat element if present
    var catEl = document.querySelector('.post-cat');
    var category = catEl ? catEl.textContent.trim() : 'uncategorized';

    trackEvent('blog_read', { post_title: postTitle, category: category });
  }

  // ─── 8. Blog category filter ──────────────────────────────────────────────

  function initCatFilterTracking() {
    document.querySelectorAll('.cat-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cat = this.getAttribute('data-cat') || this.textContent.trim();
        trackEvent('blog_filter', { category: cat });
      });
    });
  }

  // ─── 9. Share button clicks ────────────────────────────────────────────────

  function initShareTracking() {
    var titleEl = document.querySelector('meta[property="og:title"]');
    var postTitle = titleEl ? titleEl.getAttribute('content') : document.title;

    document.querySelectorAll('.share-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var href = this.getAttribute('href') || '';
        var platform;
        if (href.indexOf('twitter.com') !== -1) {
          platform = 'twitter';
        } else if (href.indexOf('linkedin.com') !== -1) {
          platform = 'linkedin';
        } else {
          // copy-btn or any other share button
          platform = 'copy';
        }
        trackEvent('blog_share', { platform: platform, post: postTitle });
      });
    });
  }

  // ─── 10. Section scroll — IntersectionObserver, once per session ──────────

  function initSectionViewTracking() {
    var secs = document.querySelectorAll('.sec[id]');
    if (!secs.length) return;

    var secObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var rawId = entry.target.id;
        // Strip language suffix (-en / -ar)
        var section = rawId.replace(/-(en|ar)$/, '');
        if (viewedSections[section]) return;
        viewedSections[section] = true;
        trackEvent('section_view', { section: section });
      });
    }, { threshold: 0.3 });

    secs.forEach(function(sec) { secObs.observe(sec); });
  }

  // ─── 12. Scroll depth ─────────────────────────────────────────────────────

  function initScrollDepthTracking() {
    var thresholds = [25, 50, 75, 100];
    var ticking = false;

    window.addEventListener('scroll', function() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        var scrolled = window.scrollY + window.innerHeight;
        var total = document.documentElement.scrollHeight;
        var pct = Math.floor((scrolled / total) * 100);
        thresholds.forEach(function(t) {
          if (pct >= t && !depthsFired[t]) {
            depthsFired[t] = true;
            trackEvent('scroll_depth', { depth: t + '%' });
          }
        });
        ticking = false;
      });
    }, { passive: true });
  }

  // ─── 13. Time on page ─────────────────────────────────────────────────────

  function initTimeTracking() {
    var milestones = [30, 60, 120, 300];
    var start = Date.now();

    milestones.forEach(function(seconds) {
      setTimeout(function() {
        if (timesFired[seconds]) return;
        timesFired[seconds] = true;
        trackEvent('engaged_time', { seconds: seconds });
      }, seconds * 1000);
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  function initTracking() {
    initThemeTracking();
    initLangTracking();
    initCopyTracking();
    initLinkTracking();
    initCtaTracking();
    initBlogPostTracking();
    initCatFilterTracking();
    initShareTracking();
    initSectionViewTracking();
    initScrollDepthTracking();
    initTimeTracking();
    initVisitorCounter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }

})();
