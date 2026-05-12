/* =============================================
   search.js — Site-wide search overlay
     - Cmd+K / Ctrl+K to open
     - "/" key also opens (Gmail-style)
     - Esc to close, Arrow keys to navigate, Enter to open
     - Loads data/search-index.json once, caches in memory
     - Simple substring + token scoring (no fuzzy lib dependency)
   ============================================= */

(function() {
  'use strict';

  // ─── Compute path prefix to data/search-index.json ─────────────────────────
  // Pages live at different depths from the root. Use the canonical link to
  // derive the root URL, or fall back to a depth-counting heuristic.

  function getDataUrl() {
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon && canon.href) {
      try {
        var u = new URL(canon.href);
        // Trim filename from pathname to get directory
        var dir = u.pathname.replace(/[^/]*$/, '');
        // Strip back to the cv/ root by walking up the canonical's depth
        // relative to BASE. Simpler: find "/cv/" and use that.
        var idx = dir.indexOf('/cv/');
        if (idx >= 0) {
          return u.origin + dir.substring(0, idx) + '/cv/data/search-index.json';
        }
        return u.origin + '/data/search-index.json';
      } catch (e) {}
    }
    // Fallback: depth from pathname
    var segments = location.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segments[segments.length - 1] && segments[segments.length - 1].indexOf('.') > -1) {
      segments.pop(); // drop filename
    }
    var cvIdx = segments.indexOf('cv');
    if (cvIdx >= 0) {
      return '/' + segments.slice(0, cvIdx + 1).join('/') + '/data/search-index.json';
    }
    return '../'.repeat(segments.length) + 'data/search-index.json';
  }

  function getRootPrefix() {
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon && canon.href) {
      try {
        var u = new URL(canon.href);
        var idx = u.pathname.indexOf('/cv/');
        if (idx >= 0) return u.origin + u.pathname.substring(0, idx + 4);
        return u.origin + '/';
      } catch (e) {}
    }
    return '/';
  }

  // ─── Index loader ──────────────────────────────────────────────────────────

  var indexCache = null;
  var indexPromise = null;

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (indexPromise) return indexPromise;
    indexPromise = fetch(getDataUrl(), { cache: 'default' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (d && d.items) {
          indexCache = d.items;
          return indexCache;
        }
        return [];
      })
      .catch(function() { return []; });
    return indexPromise;
  }

  // ─── Scoring ──────────────────────────────────────────────────────────────

  function score(item, query) {
    if (!query) return 0;
    var q = query.toLowerCase().trim();
    var qTokens = q.split(/\s+/);
    var title = (item.title || '').toLowerCase();
    var desc  = (item.desc  || '').toLowerCase();
    var kw    = (item.keywords || '').toLowerCase();
    var tags  = (item.tags || []).join(' ').toLowerCase();

    var s = 0;
    // Full-phrase title match — strongest signal
    if (title.indexOf(q) !== -1) s += 100;
    // Title starts-with query
    if (title.indexOf(q) === 0) s += 30;
    // Each token in title
    qTokens.forEach(function(t) {
      if (t.length < 2) return;
      if (title.indexOf(t) !== -1) s += 20;
      if (desc.indexOf(t)  !== -1) s += 8;
      if (kw.indexOf(t)    !== -1) s += 5;
      if (tags.indexOf(t)  !== -1) s += 6;
    });
    return s;
  }

  function rank(items, query) {
    var scored = items.map(function(i) { return { item: i, s: score(i, query) }; })
                      .filter(function(r) { return r.s > 0; })
                      .sort(function(a, b) { return b.s - a.s; });
    return scored.slice(0, 12).map(function(r) { return r.item; });
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('site-search-styles')) return;
    var style = document.createElement('style');
    style.id = 'site-search-styles';
    style.textContent = ''
      + '.ss-overlay{position:fixed;inset:0;z-index:1000;background:rgba(10,15,26,.78);backdrop-filter:blur(8px);display:none;align-items:flex-start;justify-content:center;padding-top:80px;animation:ss-fade .15s ease}'
      + '.ss-overlay.open{display:flex}'
      + '@keyframes ss-fade{from{opacity:0}to{opacity:1}}'
      + '.ss-box{width:min(640px,calc(100% - 32px));background:#1a2236;border:1px solid rgba(148,163,184,.18);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;display:flex;flex-direction:column;max-height:70vh}'
      + 'html[data-theme="light"] .ss-overlay{background:rgba(15,23,42,.4)}'
      + 'html[data-theme="light"] .ss-box{background:#fff;border-color:rgba(15,23,42,.1)}'
      + '.ss-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(148,163,184,.12)}'
      + '.ss-head svg{width:18px;height:18px;color:#94a3b8;flex-shrink:0}'
      + '.ss-input{flex:1;border:none;background:none;outline:none;font-size:16px;color:#f1f5f9;font-family:"Outfit",sans-serif}'
      + 'html[data-theme="light"] .ss-input{color:#0f172a}'
      + '.ss-input::placeholder{color:#64748b}'
      + '.ss-kbd{font-family:"JetBrains Mono",monospace;font-size:11px;color:#94a3b8;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.2);border-radius:5px;padding:2px 6px;white-space:nowrap}'
      + '.ss-results{flex:1;overflow-y:auto;padding:6px}'
      + '.ss-results::-webkit-scrollbar{width:6px}'
      + '.ss-results::-webkit-scrollbar-thumb{background:rgba(148,163,184,.2);border-radius:3px}'
      + '.ss-empty{padding:36px 18px;text-align:center;color:#94a3b8;font-size:13px}'
      + '.ss-empty strong{color:#f1f5f9;display:block;margin-bottom:6px;font-size:14px}'
      + 'html[data-theme="light"] .ss-empty strong{color:#0f172a}'
      + '.ss-row{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:11px 14px;border-radius:8px;text-decoration:none;color:inherit;cursor:pointer;transition:background .12s}'
      + '.ss-row.on,.ss-row:hover{background:rgba(56,189,248,.08)}'
      + 'html[data-theme="light"] .ss-row.on,html[data-theme="light"] .ss-row:hover{background:rgba(37,99,235,.06)}'
      + '.ss-kind{font-family:"JetBrains Mono",monospace;font-size:10px;color:#38bdf8;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.22);border-radius:5px;padding:2px 7px;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0;min-width:50px;text-align:center}'
      + '.ss-row[data-kind="post"] .ss-kind{color:#a78bfa;background:rgba(167,139,250,.12);border-color:rgba(167,139,250,.22)}'
      + '.ss-row[data-kind="project"] .ss-kind{color:#34d399;background:rgba(52,211,153,.12);border-color:rgba(52,211,153,.22)}'
      + '.ss-main{min-width:0}'
      + '.ss-title{font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + 'html[data-theme="light"] .ss-title{color:#0f172a}'
      + '.ss-desc{font-size:12.5px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.ss-arrow{color:#94a3b8;opacity:0;transition:opacity .15s,transform .15s}'
      + '.ss-row.on .ss-arrow{opacity:1;transform:translateX(2px)}'
      + 'html[dir="rtl"] .ss-row.on .ss-arrow{transform:translateX(-2px)}'
      + '.ss-foot{display:flex;gap:14px;padding:9px 16px;border-top:1px solid rgba(148,163,184,.12);background:rgba(0,0,0,.18);font-size:11px;color:#94a3b8}'
      + 'html[data-theme="light"] .ss-foot{background:rgba(15,23,42,.03)}'
      + '.ss-foot span{display:inline-flex;align-items:center;gap:5px}'
      + '@media(max-width:600px){.ss-overlay{padding-top:50px}.ss-foot{display:none}}';
    document.head.appendChild(style);
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'ss-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Search');
    overlay.innerHTML = ''
      + '<div class="ss-box" role="combobox" aria-expanded="true" aria-controls="ss-results">'
      + '  <div class="ss-head">'
      + '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
      + '    <input type="search" class="ss-input" placeholder="Search posts, projects, pages…" autocomplete="off" autocorrect="off" aria-label="Search query">'
      + '    <span class="ss-kbd">Esc</span>'
      + '  </div>'
      + '  <div class="ss-results" id="ss-results" role="listbox"></div>'
      + '  <div class="ss-foot">'
      + '    <span><span class="ss-kbd">↑↓</span> navigate</span>'
      + '    <span><span class="ss-kbd">↵</span> open</span>'
      + '    <span style="margin-inline-start:auto"><span class="ss-kbd">⌘K</span> or <span class="ss-kbd">/</span> to open</span>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  var overlay = null;
  var input = null;
  var resultsEl = null;
  var selectedIdx = 0;
  var currentResults = [];
  var rootPrefix = '';

  function open() {
    if (!overlay) {
      injectStyles();
      overlay = buildOverlay();
      input = overlay.querySelector('.ss-input');
      resultsEl = overlay.querySelector('.ss-results');
      rootPrefix = getRootPrefix();
      bindOverlayEvents();
      loadIndex().then(function() { render(''); });
    }
    overlay.classList.add('open');
    // Wait a tick for display to apply, then focus
    setTimeout(function() { if (input) input.focus(); }, 10);
    if (typeof gtag === 'function') gtag('event', 'search_open', { event_category: 'Search' });
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  function isOpen() {
    return overlay && overlay.classList.contains('open');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function render(query) {
    if (!resultsEl) return;
    var q = (query || '').trim();
    if (!indexCache) {
      resultsEl.innerHTML = '<div class="ss-empty">Loading…</div>';
      return;
    }
    if (!q) {
      // Show top defaults
      currentResults = indexCache.slice(0, 8);
    } else {
      currentResults = rank(indexCache, q);
    }
    selectedIdx = 0;
    if (currentResults.length === 0) {
      resultsEl.innerHTML = '<div class="ss-empty"><strong>No results</strong>Try a different keyword.</div>';
      return;
    }
    var html = currentResults.map(function(r, i) {
      var url = rootPrefix.replace(/\/+$/, '/') + r.url.replace(/^\/+/, '');
      // Normalize blog/index.html and projects/index.html etc.
      url = url.replace(/index\.html$/, '');
      var kindLabel = r.kind === 'post' ? 'Post' : r.kind === 'project' ? 'Project' : 'Page';
      return '<a class="ss-row' + (i === 0 ? ' on' : '') + '" data-kind="' + escapeHtml(r.kind) + '" data-idx="' + i + '" href="' + escapeHtml(url) + '" role="option">'
           + '<span class="ss-kind">' + escapeHtml(kindLabel) + '</span>'
           + '<div class="ss-main">'
           + '<div class="ss-title">' + escapeHtml(r.title) + '</div>'
           + (r.desc ? '<div class="ss-desc">' + escapeHtml(r.desc) + '</div>' : '')
           + '</div>'
           + '<span class="ss-arrow">→</span>'
           + '</a>';
    }).join('');
    resultsEl.innerHTML = html;
    selectActive();
  }

  function selectActive() {
    var rows = resultsEl.querySelectorAll('.ss-row');
    rows.forEach(function(r, i) { r.classList.toggle('on', i === selectedIdx); });
    var active = rows[selectedIdx];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function bindOverlayEvents() {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });
    input.addEventListener('input', function(e) {
      render(e.target.value);
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(currentResults.length - 1, selectedIdx + 1);
        selectActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(0, selectedIdx - 1);
        selectActive();
      } else if (e.key === 'Enter') {
        var rows = resultsEl.querySelectorAll('.ss-row');
        if (rows[selectedIdx]) {
          if (typeof gtag === 'function') {
            gtag('event', 'search_select', { event_category: 'Search', event_label: currentResults[selectedIdx].id });
          }
          window.location.href = rows[selectedIdx].href;
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  // ─── Global hotkeys ───────────────────────────────────────────────────────

  function bindHotkeys() {
    document.addEventListener('keydown', function(e) {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen() ? close() : open();
        return;
      }
      // "/" key when not typing in an input — Gmail-style
      if (e.key === '/' && !isOpen()) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        open();
        return;
      }
      // Esc on open overlay (caught also by input)
      if (e.key === 'Escape' && isOpen()) {
        close();
      }
    });
  }

  // ─── Trigger button (optional — pages can add <button data-search-open>) ───

  function bindOpenTriggers() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-search-open]');
      if (btn) {
        e.preventDefault();
        open();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      bindHotkeys();
      bindOpenTriggers();
    });
  } else {
    bindHotkeys();
    bindOpenTriggers();
  }

  // Expose for programmatic open
  window.openSiteSearch = open;
})();
