# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, dependency-free bilingual (English ↔ Arabic) portfolio site for Mahmoud Hamdy. Hand-written HTML/CSS/JS, hosted on GitHub Pages at `https://mahmoodhamdi.github.io/cv/`. No package.json, no bundler, no test suite — the source files are the deployed artifact.

## Working with the site

There is no build step. To preview locally, serve the directory with any static server, e.g.:

```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

The service worker (`sw.js`) only activates on http(s) origins, so `file://` previews skip PWA behavior — open via `http://localhost` to test PWA / offline.

Deployment is one-shot via `./deploy.sh` — it configures git, creates the GitHub repo via `gh`, pushes, and enables Pages via the GitHub API. After initial deploy, `git push` to `main` is enough; Pages serves from `/` on `main`.

## Architecture

### Bilingual layout

Every page that has Arabic content contains **two parallel DOM subtrees**, not a single tree with swapped strings:

- `index.html` has `<div id="en-cv">…</div>` and `<div id="ar-cv">…</div>`.
- Each section has mirrored IDs: `about-en` / `about-ar`, `stats-en` / `stats-ar`, etc. The nav buttons (`<button class="nav-a" data-t="about-en">`) target the version that matches the current language.
- `js/language.js` `setLang('en'|'ar')` flips `document.documentElement.dir`/`lang`, toggles `display` on the two subtrees and the two `<nav>` blocks (`#nav-en` / `#nav-ar`), then re-runs observers (`initObs`, `initHeatmap`, `reobserveAll`, `updateNav`, `initVisitorCounter`).

**Implication:** any content edit must be made in *both* subtrees, and any new section needs both an `-en` and `-ar` ID plus matching nav buttons in `#nav-en` and `#nav-ar`.

### CSS bundles (manually concatenated)

`index.html` and per-project pages link **two bundle files** that are physically concatenated from smaller sources:

- `css/bundle.css` = `main.css` + `themes.css` + `components.css` (banner comments mark each segment).
- `css/utilities.css` = `animations.css` + `arabic.css` + `responsive.css`.

Sub-pages like `blog/index.html` instead link the **individual** files (`../css/main.css`, `../css/themes.css`, `blog.css`). So when editing a source CSS file you must also regenerate the corresponding bundle, or the change will be invisible on whichever pages link the bundle. There is no script that does this — concatenate manually and preserve the `/* === filename === */` markers.

`css/print.css` is loaded with `media="print"` and only affects the print layout. `css/sections.css` is its own file (not bundled).

### JS module layout

All scripts are plain `<script defer>` files, no modules, no bundler. They communicate through a single `window.CV` namespace and `window.*` globals:

- `main.js` — page-load fade-in, scroll-progress bar, scroll-to-top, scroll-spy tick (calls `window.updateNav`).
- `language.js` — owns `window.CV.lang`; exposes `setLang`.
- `theme.js` — owns `data-theme` attr; persists to `localStorage` as `cv-theme`; exposes `toggleTheme`.
- `navigation.js` — `updateNav` scroll-spy; nav-click smooth-scroll with 60px offset.
- `animations.js` — IntersectionObservers for `.sec` reveal, counter animation, contribution-heatmap; exposes `initObs`, `initHeatmap`, `reobserveAll`.
- `analytics.js` — GA4 event wrapper + a *synthetic* visitor counter (`initVisitorCounter` computes a fake count from launch date `2026-03-30` + hour + random jitter; it is intentionally not a real analytics read).
- `contact.js` — contact form submits via `fetch` to `https://api.web3forms.com/submit`; reads `form.dataset.lang` to choose AR vs EN copy.
- `pwa.js` — registers `sw.js`, handles `beforeinstallprompt`, shows an offline banner and an "update available" toast on SW update.
- `utils.js` — `showToast` + `[data-copy]` click-to-copy.

Load order in `index.html` matters (utils → theme → language → navigation → animations → analytics → contact → pwa → main). GA4's `gtag.js` is injected after a 2s delay to avoid blocking LCP.

### Service worker cache

`sw.js` uses a **manually maintained** asset list and a versioned cache name (currently `mahmoud-cv-v6`). Strategy is cache-first with network-update; on fetch failure it falls back to `./404.html`.

**Two things break together if you forget them:**

1. When you add a new HTML, CSS, or JS file that should work offline, add it to the `ASSETS` array in `sw.js`.
2. When you change *any* cached asset, **bump `CACHE_NAME`** (e.g. `mahmoud-cv-v6` → `-v7`). Otherwise returning visitors keep getting the stale cached version forever — the activate handler only deletes caches whose name doesn't match `CACHE_NAME`.

### SEO / discovery surfaces (also manually maintained)

When you add a blog post or project page, update **all** of:

- `sw.js` `ASSETS` array (+ bump `CACHE_NAME`)
- `sitemap.xml` (a `<url>` entry with `<lastmod>`)
- `blog/feed.xml` (English RSS) and `blog/feed-ar.xml` (Arabic RSS)
- `blog/index.html` post list (in both EN and AR subtrees)

The same applies to project pages, with `projects/<slug>.html` instead of `blog/posts/...`.

### Per-page integrations baked into HTML

These IDs/endpoints are hard-coded inline in every page that needs them — not centralized:

- **GA4 measurement ID:** `G-D0H1J8BSKJ` (deferred `gtag.js` in `index.html`; eager in blog/project pages). Search/replace across the tree when rotating.
- **Web3Forms endpoint:** `https://api.web3forms.com/submit` (with the access key inside the form as a hidden `access_key` field).
- **Canonical host:** `https://mahmoodhamdi.github.io/cv/` is repeated in every page's `<link rel="canonical">`, OG/Twitter metadata, and JSON-LD `Person`/`Article` schema. `CNAME` exists but is empty — there is no custom domain configured.

### Theming

Two themes via `html[data-theme="dark"|"light"]`. Dark is the default and is also inlined as critical CSS in `index.html`'s `<style>` block to avoid a flash. Light overrides live in `css/themes.css`. The theme toggle persists to `localStorage['cv-theme']`; a top-of-`theme.js` IIFE restores it before paint.

## Conventions worth knowing

- **No frameworks.** Don't introduce React/Vue/Tailwind/etc. — the whole project is intentionally zero-dependency runtime.
- **Inline critical CSS** in `<head>` of `index.html` and each `projects/*.html` is hand-curated to cover above-the-fold; the rest is preloaded async. Keep these in sync with `main.css`/`sections.css` if you change variables (`--bg`, `--accent`, `--grad`, etc.).
- **Section reveal** depends on the `.sec` class + `IntersectionObserver`. Sections without `.sec` won't animate in.
- **Counters** use `data-count="N"`; `animations.js` animates from 0 to N once per section (guarded by `window.CV.cFlag`).
- **Click-to-copy** uses `data-copy="text"` on any element (`utils.js`).
- **Print layout** is real and exercised — there's a Print button in the header. Test print preview when restructuring sections; `css/print.css` is the override.
