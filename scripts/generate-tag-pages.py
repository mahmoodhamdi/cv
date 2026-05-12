#!/usr/bin/env python3
"""Generates a separate landing page for each blog category at
blog/tag/<slug>/index.html, listing matching posts.

Source of truth: data/search-index.json (already built by
generate-search-index.py). Posts have a tags array; the first tag
is treated as the primary category.
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAGS_DIR = ROOT / "blog" / "tag"
INDEX_FILE = ROOT / "data" / "search-index.json"
BASE = "https://mahmoodhamdi.github.io/cv"


def escape_html(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", s.lower().replace(" ", "-")).strip("-") or "tag"


def render_page(tag: str, posts: list[dict]) -> str:
    tag_label = tag.capitalize()
    canonical = f"{BASE}/blog/tag/{slugify(tag)}/"
    breadcrumb = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{BASE}/blog/"},
            {"@type": "ListItem", "position": 3, "name": tag_label, "item": canonical},
        ],
    }, ensure_ascii=False)

    cards = ""
    for p in posts:
        url = f"{BASE}/{p['url']}" if not p['url'].startswith('http') else p['url']
        title = escape_html(p.get('title', ''))
        desc = escape_html(p.get('desc', '')[:200])
        cards += (
            f'<a class="t-card" href="../../posts/{Path(p["url"]).name}">'
            f'<h2>{title}</h2>'
            f'<p>{desc}</p>'
            f'</a>'
        )

    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{tag_label} — Blog | Mahmoud Hamdy</title>
<meta name="description" content="All blog posts tagged {tag_label.lower()} — {len(posts)} article{'s' if len(posts) != 1 else ''} by Mahmoud Hamdy.">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0f1a">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{tag_label} — Blog | Mahmoud Hamdy">
<meta property="og:description" content="All blog posts tagged {tag_label.lower()}.">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{BASE}/assets/og/og-blog.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{BASE}/assets/og/og-blog.png">
<link rel="icon" type="image/svg+xml" href="../../../assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="../../../assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="../../../assets/favicon-16.png">
<link rel="apple-touch-icon" href="../../../assets/apple-touch-icon.png">
<link rel="manifest" href="../../../manifest.json">
<link rel="alternate" type="application/rss+xml" title="Mahmoud Hamdy — Blog" href="{BASE}/blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<script type="application/ld+json">
{breadcrumb}
</script>
<style>
:root{{--bg:#0a0f1a;--bg-alt:#111827;--card:#1a2236;--accent:#38bdf8;--accent-g:rgba(56,189,248,.15);--accent2:#818cf8;--txt:#f1f5f9;--txt2:#94a3b8;--muted:#8e99ad;--bdr:rgba(148,163,184,.1);--grad:linear-gradient(135deg,#38bdf8,#818cf8);--fn:'Outfit',sans-serif;--mono:'JetBrains Mono',monospace;--nav-bg:rgba(10,15,26,.88)}}
*{{margin:0;padding:0;box-sizing:border-box}}html{{scroll-behavior:smooth}}
body{{font-family:var(--fn);background:var(--bg);color:var(--txt);line-height:1.6;padding-top:52px}}
.wrap{{max-width:880px;margin:0 auto;padding:40px 24px}}
.navbar{{position:fixed;top:0;left:0;right:0;z-index:90;background:var(--nav-bg);backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr)}}
.nav-in{{max-width:1100px;margin:0 auto;padding:0 24px;display:flex;align-items:center;height:48px;gap:14px;font-size:13px}}
.nav-in a{{color:var(--muted);text-decoration:none;display:inline-flex;align-items:center;gap:5px}}
.nav-in a:hover{{color:var(--accent)}}
.nav-in svg{{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2}}
.nav-sep{{color:var(--muted);opacity:.5}}
.t-hero{{padding:30px 0 24px}}
.t-hero .tag-chip{{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;background:var(--accent-g);color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px}}
.t-hero h1{{font-size:38px;font-weight:600;letter-spacing:-.02em;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}}
.t-hero p{{font-size:14px;color:var(--txt2)}}
.t-grid{{display:flex;flex-direction:column;gap:14px}}
.t-card{{display:block;background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:22px 24px;text-decoration:none;color:inherit;transition:transform .25s,border-color .25s,box-shadow .25s}}
.t-card:hover{{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 10px 28px var(--accent-g)}}
.t-card h2{{font-size:19px;font-weight:600;margin-bottom:8px;line-height:1.4;color:var(--txt)}}
.t-card p{{font-size:13.5px;color:var(--txt2);line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}
.t-back{{display:inline-flex;align-items:center;gap:6px;margin-top:30px;font-size:13px;color:var(--accent);text-decoration:none}}
.t-back:hover{{text-decoration:underline}}
html[data-theme="light"]{{--bg:#f8fafc;--bg-alt:#f1f5f9;--card:#fff;--txt:#0f172a;--txt2:#334155;--muted:#64748b;--bdr:rgba(15,23,42,.1);--nav-bg:rgba(248,250,252,.88);--accent-g:rgba(56,189,248,.12)}}
</style>
<link rel="stylesheet" href="../../../css/bundle.css">
</head>
<body class="loaded">

<nav class="navbar"><div class="nav-in">
  <a href="../../../"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>Home</a>
  <span class="nav-sep">·</span>
  <a href="../../">Blog</a>
  <span class="nav-sep">·</span>
  <span style="color:var(--txt2)">{escape_html(tag_label)}</span>
</div></nav>

<main class="wrap">
<section class="t-hero">
  <span class="tag-chip">{escape_html(tag_label)}</span>
  <h1>Tagged "{escape_html(tag_label)}"</h1>
  <p>{len(posts)} article{'s' if len(posts) != 1 else ''} on this topic.</p>
</section>

<section class="t-grid">
{cards}
</section>

<a class="t-back" href="../../">← All posts</a>

</main>
<script src="../../../js/search.js" defer></script>
</body>
</html>
"""


def main() -> int:
    if not INDEX_FILE.exists():
        print(f"missing {INDEX_FILE}", file=sys.stderr); return 1
    data = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    posts = [i for i in data.get("items", []) if i.get("kind") == "post"]
    if not posts:
        print("no posts in index"); return 1

    groups: dict[str, list[dict]] = defaultdict(list)
    for p in posts:
        for tag in p.get("tags", []) or []:
            groups[tag].append(p)

    if not groups:
        print("no tags found across posts"); return 0

    TAGS_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for tag, ps in groups.items():
        slug = slugify(tag)
        out_dir = TAGS_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        page = render_page(tag, sorted(ps, key=lambda p: p.get("title", "")))
        (out_dir / "index.html").write_text(page, encoding="utf-8")
        written += 1
        print(f"  ✓ blog/tag/{slug}/  ({len(ps)} posts)")

    print(f"\nGenerated {written} tag pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
