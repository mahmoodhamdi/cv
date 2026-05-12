/* =============================================
   blog-enhance.js — Per-post enhancements:
     1. Reading progress bar (fixed top, fills as user scrolls article)
     2. Per-post view counter via counterapi.dev (anonymous, free)
     3. Reading time visible while scrolled
   Loaded only on blog post pages (detected by .post-body OR
   #en-content / #ar-content existence).
   ============================================= */

(function() {
  'use strict';

  // Bail if not a blog post page
  var isPost = document.querySelector('.post-body') ||
               document.getElementById('en-content') ||
               document.getElementById('ar-content');
  if (!isPost) return;

  // ─── Reading progress bar ─────────────────────────────────────────────────

  var bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  function updateProgress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (max <= 0) { bar.style.width = '0%'; return; }
    var pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    bar.style.width = pct + '%';
  }

  var rafQueued = false;
  window.addEventListener('scroll', function() {
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(function() {
      updateProgress();
      rafQueued = false;
    });
  }, { passive: true });
  updateProgress();

  // ─── Per-post view counter ────────────────────────────────────────────────

  // Derive a slug from the path: /blog/posts/foo.html → "foo"
  var path = window.location.pathname || '';
  var match = path.match(/\/blog\/posts\/([^/]+?)(?:\.html)?$/);
  var slug = match ? match[1].replace(/[^a-z0-9-]/gi, '').toLowerCase() : '';

  if (slug) {
    var SESSION_FLAG = 'blog-viewed-' + slug;
    var counted = false;
    try { counted = sessionStorage.getItem(SESSION_FLAG) === '1'; } catch (e) {}
    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    var endpoint = isLocal || counted
      ? 'https://api.counterapi.dev/v1/mahmoodhamdi-blog/' + slug + '/'
      : 'https://api.counterapi.dev/v1/mahmoodhamdi-blog/' + slug + '/up';

    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timeout = setTimeout(function() { if (ctrl) ctrl.abort(); }, 4000);

    fetch(endpoint, ctrl ? { signal: ctrl.signal } : {})
      .then(function(r) { clearTimeout(timeout); return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d || typeof d.count !== 'number') return;
        if (!counted && !isLocal) {
          try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch (e) {}
        }
        renderViewCount(d.count);
      })
      .catch(function() { clearTimeout(timeout); });
  }

  function renderViewCount(count) {
    // Find an existing meta row in the post header to insert into.
    // The blog post template typically has .post-meta with category + readtime.
    var metas = document.querySelectorAll('.post-meta, .post-header-meta');
    var isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
    metas.forEach(function(meta) {
      if (meta.querySelector('.post-views')) return;
      var span = document.createElement('span');
      span.className = 'post-views';
      var label = isAr ? toArabic(count) + ' مشاهدة' : count.toLocaleString('en-US') + (count === 1 ? ' view' : ' views');
      span.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ' + label;
      meta.appendChild(span);
    });
  }

  function toArabic(n) {
    var map = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};
    return String(n).replace(/[0-9]/g, function(c) { return map[c] || c; });
  }
})();
