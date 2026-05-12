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

  // ─── Smart related posts ──────────────────────────────────────────────────
  // Picks posts that share the current post's category, excluding the current
  // post. Falls back to recent posts if fewer than 3 matches.

  function smartRelated() {
    var grid = document.querySelector('.related-grid');
    if (!grid || !slug) return;

    // Compute URL prefix to data/search-index.json — posts live at
    // /cv/blog/posts/X.html so it's two levels up.
    var canon = document.querySelector('link[rel="canonical"]');
    var base = '';
    if (canon && canon.href) {
      try {
        var u = new URL(canon.href);
        var idx = u.pathname.indexOf('/cv/');
        base = u.origin + (idx >= 0 ? u.pathname.substring(0, idx + 4) : '/');
      } catch (e) {}
    }
    var indexUrl = base ? base + 'data/search-index.json' : '../../data/search-index.json';

    fetch(indexUrl, { cache: 'default' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d || !d.items) return;
        var posts = d.items.filter(function(p) { return p.kind === 'post'; });
        var current = posts.find(function(p) { return p.url.indexOf(slug + '.html') !== -1; });
        if (!current) return;
        var curTags = (current.tags || []).join(' ');
        var scored = posts
          .filter(function(p) { return p.url !== current.url; })
          .map(function(p) {
            var s = 0;
            (p.tags || []).forEach(function(t) {
              if (curTags.indexOf(t) !== -1) s += 10;
            });
            return { p: p, s: s };
          })
          .sort(function(a, b) { return b.s - a.s; });
        // Top 3, prefer matching tags, then recent (= earlier in array)
        var picked = scored.slice(0, 3).map(function(r) { return r.p; });
        if (picked.length < 2) return;
        renderRelated(grid, picked, base);
      })
      .catch(function() { /* keep static fallback */ });
  }

  function renderRelated(grid, posts, base) {
    var isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
    var html = posts.map(function(p) {
      var url = base ? base + p.url : '../' + p.url.replace(/^blog\//, '');
      var cat = (p.tags && p.tags[0]) || 'Article';
      var catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      return '<a href="' + url + '" class="related-card">'
           + '<span class="post-cat">' + escapeHtml(catLabel) + '</span>'
           + '<h4>' + escapeHtml(p.title) + '</h4>'
           + (p.desc ? '<span>' + escapeHtml(p.desc.substring(0, 90)) + (p.desc.length > 90 ? '…' : '') + '</span>' : '')
           + '</a>';
    }).join('');
    grid.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  smartRelated();

  // ─── Auto TOC + heading anchors ───────────────────────────────────────────
  // Builds a sticky table of contents from h2 headings inside .post-body.
  // Also adds an id= and a "#" anchor link to every h2.

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ\s-]/g, '')   // keep Arabic letters
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60) || ('h2-' + Math.random().toString(36).slice(2, 6));
  }

  function buildTOC() {
    var bodies = document.querySelectorAll('.post-body');
    if (!bodies.length) return;
    // Pick the currently-visible language body if there are two
    var body = null;
    bodies.forEach(function(b) {
      var hidden = b.closest('[id$="-content"]');
      if (!hidden || hidden.offsetParent !== null) body = body || b;
    });
    if (!body) body = bodies[0];

    var headings = body.querySelectorAll('h2');
    if (headings.length < 3) return;

    // Assign IDs + insert anchor symbols
    var idSeen = {};
    var entries = [];
    headings.forEach(function(h) {
      if (!h.id) {
        var s = slugify(h.textContent);
        if (idSeen[s]) s = s + '-' + (++idSeen[s]);
        idSeen[s] = 1;
        h.id = s;
      }
      // Visible anchor link on hover
      if (!h.querySelector('.h-anchor')) {
        var a = document.createElement('a');
        a.className = 'h-anchor';
        a.href = '#' + h.id;
        a.setAttribute('aria-label', 'Link to this section');
        a.innerHTML = '#';
        h.appendChild(a);
      }
      entries.push({ id: h.id, text: h.textContent.replace(/#\s*$/, '').trim() });
    });

    // Render TOC container
    var isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
    var toc = document.createElement('aside');
    toc.className = 'post-toc';
    toc.setAttribute('aria-label', isAr ? 'فهرس المقال' : 'Table of contents');
    var listHtml = entries.map(function(e) {
      return '<li><a href="#' + e.id + '">' + escapeHtml(e.text) + '</a></li>';
    }).join('');
    toc.innerHTML =
      '<div class="post-toc-h">' + (isAr ? 'فهرس المقال' : 'In this article') + '</div>' +
      '<ul class="post-toc-list">' + listHtml + '</ul>';
    body.parentElement.insertBefore(toc, body);

    // Scroll-spy: highlight the entry whose section is currently in view
    var links = toc.querySelectorAll('.post-toc-list a');
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function(items) {
        items.forEach(function(it) {
          var id = it.target.id;
          var link = toc.querySelector('a[href="#' + id + '"]');
          if (!link) return;
          if (it.isIntersecting) {
            links.forEach(function(l) { l.classList.remove('on'); });
            link.classList.add('on');
          }
        });
      }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
      headings.forEach(function(h) { obs.observe(h); });
    }
  }

  // Run after a tick so other DOM mutations (like language switch) settle first
  setTimeout(buildTOC, 50);

  // ─── Code copy buttons ────────────────────────────────────────────────────
  // Adds a small "Copy" button to the top-right of each <pre> block.

  function addCopyButtons() {
    var pres = document.querySelectorAll('.post-body pre');
    pres.forEach(function(pre) {
      if (pre.dataset.copyWired) return;
      pre.dataset.copyWired = '1';
      pre.style.position = pre.style.position || 'relative';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      var isAr = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
      btn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
        '<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
        '<span class="code-copy-lbl">' + (isAr ? 'نسخ' : 'Copy') + '</span>';
      btn.setAttribute('aria-label', isAr ? 'نسخ الكود' : 'Copy code');

      btn.addEventListener('click', function() {
        var code = pre.querySelector('code') || pre;
        var text = code.innerText;
        var done = function(ok) {
          btn.classList.toggle('done', ok);
          var lbl = btn.querySelector('.code-copy-lbl');
          if (lbl) lbl.textContent = ok ? (isAr ? 'تم النسخ ✓' : 'Copied ✓') : (isAr ? 'فشل' : 'Failed');
          setTimeout(function() {
            btn.classList.remove('done');
            if (lbl) lbl.textContent = isAr ? 'نسخ' : 'Copy';
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() { done(true); }, function() { done(false); });
        } else {
          // Fallback: textarea + execCommand
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            done(true);
          } catch (e) { done(false); }
        }
        if (typeof gtag === 'function') {
          gtag('event', 'code_copy', { event_category: 'Blog', event_label: slug });
        }
      });
      pre.appendChild(btn);
    });
  }

  setTimeout(addCopyButtons, 60);
})();
