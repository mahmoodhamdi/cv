# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, dependency-free bilingual (English ↔ Arabic) portfolio site for Mahmoud Hamdy. Hand-written HTML/CSS/JS, hosted on GitHub Pages at `https://mahmoodhamdi.github.io/cv/`. No package.json, no bundler, no test suite — the source files are the deployed artifact.

## Working with the site

There is no compile step, but there are **idempotent build scripts** that you should re-run when you touch certain files:

```bash
python3 -m http.server 8000          # local preview at http://localhost:8000/

./scripts/build.sh                   # regenerate bundles + sitemap + SW cache
./scripts/build.sh --stats           # also refresh data/stats.json from GitHub
./scripts/fetch-github-stats.sh      # standalone — pulls live PR counts, top repos,
                                     #   latest PRs, and 60-day heatmap data
./scripts/build-css.sh               # concatenate main+themes+components → bundle.css
                                     #   and animations+arabic+responsive → utilities.css
python3 scripts/generate-sitemap.py  # rewrite sitemap.xml from filesystem + git mtime
python3 scripts/update-sw-cache.py   # rewrite sw.js ASSETS array; cache name is a
                                     #   content hash so any asset change invalidates it
```

`./scripts/build.sh` is the safe one to run on every meaningful change — each step is a no-op if there's no drift.

**GitHub Actions** (`.github/workflows/`):
- `refresh-stats.yml` — cron job runs daily at 03:00 UTC, calls `fetch-github-stats.sh`, regenerates sitemap + SW cache, commits if anything changed (with `[skip ci]` to avoid loops).
- `check-build.yml` — on every push to main and every PR. On main it auto-commits any drift in bundles/sitemap/sw.js. On PRs it fails the check if drift exists, telling the contributor to run `./scripts/build.sh` locally.

The service worker only activates on http(s) origins, so `file://` previews skip PWA behavior — open via `http://localhost` to test PWA / offline.

Deployment is one-shot via `./deploy.sh` — it configures git, creates the GitHub repo via `gh`, pushes, and enables Pages via the GitHub API. After initial deploy, `git push` to `main` is enough; Pages serves from `/` on `main`.

## Architecture

### Bilingual layout

Every page that has Arabic content contains **two parallel DOM subtrees**, not a single tree with swapped strings:

- `index.html` has `<div id="en-cv">…</div>` and `<div id="ar-cv">…</div>`.
- Each section has mirrored IDs: `about-en` / `about-ar`, `stats-en` / `stats-ar`, etc. The nav buttons (`<button class="nav-a" data-t="about-en">`) target the version that matches the current language.
- `js/language.js` `setLang('en'|'ar')` flips `document.documentElement.dir`/`lang`, toggles `display` on the two subtrees and the two `<nav>` blocks (`#nav-en` / `#nav-ar`), then re-runs observers (`initObs`, `initHeatmap`, `reobserveAll`, `updateNav`, `initVisitorCounter`).

**Implication:** any content edit must be made in *both* subtrees, and any new section needs both an `-en` and `-ar` ID plus matching nav buttons in `#nav-en` and `#nav-ar`.

### CSS bundles

`index.html` and per-project pages link **two bundle files** that are physically concatenated from smaller sources:

- `css/bundle.css` = `main.css` + `themes.css` + `components.css`
- `css/utilities.css` = `animations.css` + `arabic.css` + `responsive.css`

Sub-pages like `blog/index.html` instead link the **individual** files (`../css/main.css`, `../css/themes.css`, `blog.css`). Run `./scripts/build-css.sh` after editing any of the source CSS files — it regenerates both bundles with the `/* === filename === */` markers automatically. The `check-build.yml` workflow will also do it on push if you forget.

`css/sections.css` is its own file (not bundled). There is no print stylesheet — print was intentionally removed.

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

`sw.js` is **auto-generated** by `scripts/update-sw-cache.py`. The cache name is `mahmoud-cv-<8-char-hash>` where the hash is sha256 of (sorted asset paths + their content hashes), so any asset change invalidates the cache automatically.

Strategy is cache-first with network-update; on fetch failure it falls back to `./404.html`.

You normally don't edit `sw.js` by hand. If you add new file *types* that should be cached, add them to `PATTERNS` or `GLOB_PATTERNS` in `scripts/update-sw-cache.py`.

### SEO / discovery surfaces

When you add a blog post or project page:

- **`sw.js`** and **`sitemap.xml`** are auto-regenerated by `./scripts/build.sh` — they'll pick up any new HTML in `projects/`, `blog/`, or `blog/posts/` from the filesystem and update lastmod from git.
- **`blog/feed.xml`** (English RSS) and **`blog/feed-ar.xml`** (Arabic RSS) — still hand-maintained. Open them and add a new `<item>` entry at the top.
- **`blog/index.html`** post list — also hand-maintained. Add a new `<article class="post-card">` in both EN and AR subtrees so the post shows up in the listing.

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
