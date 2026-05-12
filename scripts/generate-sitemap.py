#!/usr/bin/env python3
"""Regenerates sitemap.xml from the HTML files on disk.

Scans:
  - root index.html, about.html, services.html
  - projects/*.html (excluding any -draft suffix)
  - blog/index.html
  - blog/posts/*.html

Uses the file's most recent git commit date for lastmod when available;
falls back to mtime. Skips files containing <meta name="robots" content="noindex">.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import xml.sax.saxutils as sax
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://mahmoodhamdi.github.io/cv"
OG_DIR   = ROOT / "assets" / "og"
OUT = ROOT / "sitemap.xml"

# (glob, changefreq, priority)
PATTERNS = [
    ("index.html",            "weekly",  "1.0"),
    ("about.html",            "monthly", "0.9"),
    ("services.html",         "monthly", "0.9"),
    ("privacy.html",          "yearly",  "0.4"),
    ("uses.html",             "monthly", "0.6"),
    ("blog/index.html",       "weekly",  "0.8"),
    ("projects/*.html",       "monthly", "0.8"),
    ("blog/posts/*.html",     "monthly", "0.7"),
]


def og_image_for(path: Path) -> str | None:
    """Map an HTML file to its OG image URL, if a matching file exists in
    assets/og/. Returns None if no specific image is available."""
    rel = path.relative_to(ROOT).as_posix()
    candidates: list[str] = []
    if rel == "index.html":          candidates = ["og-default.png"]
    elif rel == "about.html":        candidates = ["og-about.png"]
    elif rel == "services.html":     candidates = ["og-services.png"]
    elif rel == "privacy.html":      candidates = ["og-privacy.png"]
    elif rel == "uses.html":         candidates = ["og-uses.png"]
    elif rel == "blog/index.html":   candidates = ["og-blog.png"]
    elif rel == "projects/index.html": candidates = ["og-projects.png"]
    elif rel.startswith("projects/"):
        candidates = [f"og-project-{path.stem}.png"]
    elif rel.startswith("blog/posts/"):
        candidates = [f"og-post-{path.stem}.png"]
    for name in candidates:
        if (OG_DIR / name).is_file():
            return f"{BASE_URL}/assets/og/{name}"
    return None

NOINDEX = re.compile(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.I)


def git_lastmod(path: Path) -> str:
    try:
        rel = path.relative_to(ROOT)
        out = subprocess.run(
            ["git", "-C", str(ROOT), "log", "-1", "--format=%cs", "--", str(rel)],
            capture_output=True, text=True, check=False, timeout=10,
        )
        date = (out.stdout or "").strip()
        if date:
            return date
    except Exception:
        pass
    # Fallback: mtime in YYYY-MM-DD
    import datetime
    return datetime.date.fromtimestamp(path.stat().st_mtime).isoformat()


def url_for(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return BASE_URL + "/"
    if rel == "blog/index.html":
        return BASE_URL + "/blog/"
    return f"{BASE_URL}/{rel}"


def is_indexable(path: Path) -> bool:
    try:
        head = path.read_text(encoding="utf-8", errors="ignore")[:4000]
        return not NOINDEX.search(head)
    except Exception:
        return True


def collect() -> list[tuple[Path, str, str]]:
    entries: list[tuple[Path, str, str]] = []
    seen: set[Path] = set()
    for pattern, freq, prio in PATTERNS:
        for p in ROOT.glob(pattern):
            if not p.is_file() or p in seen:
                continue
            if not is_indexable(p):
                continue
            seen.add(p)
            entries.append((p, freq, prio))
    return entries


def render(entries: list[tuple[Path, str, str]]) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
             '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for path, freq, prio in sorted(entries, key=lambda x: url_for(x[0])):
        lastmod = git_lastmod(path)
        lines.append("  <url>")
        lines.append(f"    <loc>{sax.escape(url_for(path))}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{freq}</changefreq>")
        lines.append(f"    <priority>{prio}</priority>")
        img = og_image_for(path)
        if img:
            lines.append("    <image:image>")
            lines.append(f"      <image:loc>{sax.escape(img)}</image:loc>")
            lines.append("    </image:image>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main() -> int:
    entries = collect()
    if not entries:
        print("no HTML files found", file=sys.stderr)
        return 1
    OUT.write_text(render(entries), encoding="utf-8")
    print(f"→ wrote {OUT.relative_to(ROOT)} with {len(entries)} URLs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
