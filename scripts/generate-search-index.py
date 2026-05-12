#!/usr/bin/env python3
"""Generates data/search-index.json from the HTML files on disk.

Each entry has:
  - id:       stable unique slug
  - title:    page <title> stripped of " — Mahmoud Hamdy" suffix
  - desc:     <meta name="description"> content
  - url:      path relative to site root (e.g. "blog/posts/foo.html")
  - kind:     "page" | "project" | "post"
  - tags:     extracted from data-category (posts) or filename hints
  - lang:     "en" | "ar" | "both" — based on title language
  - keywords: extra terms boosted in search (h2 text + post category)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "data" / "search-index.json"

TITLE_RE   = re.compile(r"<title[^>]*>([^<]+)</title>", re.I)
DESC_RE    = re.compile(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', re.I)
CANON_RE   = re.compile(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', re.I)
H2_RE      = re.compile(r"<h2[^>]*>([^<]+)</h2>", re.I)
CAT_RE     = re.compile(r'data-category=["\']([^"\']+)["\']')
TAGS_RE    = re.compile(r'data-tags=["\']([^"\']+)["\']')
NOINDEX_RE = re.compile(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.I)

SOURCES = [
    ("index.html",         "page"),
    ("about.html",         "page"),
    ("services.html",      "page"),
    ("privacy.html",       "page"),
    ("uses.html",          "page"),
    ("blog/index.html",    "page"),
    ("projects/index.html","page"),
]


def strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


def clean_title(t: str) -> str:
    t = strip_html(t)
    for suffix in (" — Mahmoud Hamdy", " | Mahmoud Hamdy", " · Mahmoud Hamdy"):
        if t.endswith(suffix):
            t = t[:-len(suffix)]
    return t.strip()


def detect_lang(text: str) -> str:
    has_ar = any("؀" <= ch <= "ۿ" for ch in text)
    has_en = any("a" <= ch.lower() <= "z" for ch in text)
    if has_ar and has_en:
        return "both"
    return "ar" if has_ar else "en"


def extract(path: Path, kind: str) -> dict | None:
    try:
        head = path.read_text(encoding="utf-8", errors="ignore")[:6000]
        body = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None
    if NOINDEX_RE.search(head):
        return None
    tm = TITLE_RE.search(head)
    title = clean_title(tm.group(1)) if tm else path.stem
    dm = DESC_RE.search(head)
    desc = strip_html(dm.group(1)) if dm else ""
    cm = CANON_RE.search(head)
    if cm:
        url_full = cm.group(1)
        url = url_full.replace("https://mahmoodhamdi.github.io/cv/", "")
    else:
        url = path.relative_to(ROOT).as_posix()

    # H2 keywords (helps match queries like "open source" → about page)
    h2s = [strip_html(h) for h in H2_RE.findall(body)][:10]
    keywords = " ".join(h2s)

    # Tags
    tags: list[str] = []
    cat = CAT_RE.search(body)
    if cat:
        tags.append(cat.group(1))
    techs = TAGS_RE.search(body)
    if techs:
        tags.extend(techs.group(1).split())

    return {
        "id":       path.relative_to(ROOT).as_posix().replace("/", "-").replace(".html", ""),
        "title":    title,
        "desc":     desc,
        "url":      url,
        "kind":     kind,
        "tags":     sorted(set(tags)) if tags else [],
        "lang":     detect_lang(title + " " + desc),
        "keywords": keywords[:300],
    }


def collect() -> list[dict]:
    entries: list[dict] = []
    for rel, kind in SOURCES:
        p = ROOT / rel
        if p.is_file():
            e = extract(p, kind)
            if e:
                entries.append(e)
    for p in sorted((ROOT / "projects").glob("*.html")):
        if p.name == "index.html":
            continue
        e = extract(p, "project")
        if e:
            entries.append(e)
    for p in sorted((ROOT / "blog" / "posts").glob("*.html")):
        e = extract(p, "post")
        if e:
            entries.append(e)
    return entries


def main() -> int:
    entries = collect()
    if not entries:
        print("no entries found", file=sys.stderr); return 1
    payload = {
        "generated": __import__("datetime").datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "count": len(entries),
        "items": entries,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    by_kind: dict[str, int] = {}
    for e in entries:
        by_kind[e["kind"]] = by_kind.get(e["kind"], 0) + 1
    print(f"→ wrote {OUT.relative_to(ROOT)} with {len(entries)} entries: {by_kind}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
