#!/usr/bin/env python3
"""Generates blog/feed.xml (English) and blog/feed-ar.xml (Arabic) from
the on-disk blog posts.

Source of truth: each post's <title>, <meta description>, JSON-LD
datePublished (if present), and the post slug.

The Arabic feed reuses the same posts but pulls Arabic title/desc from
the post's `#ar-content` block if found; otherwise it falls back to the
English title with an Arabic-friendly note. (Real Arabic-specific
metadata can be added to a post via:
  <meta name="ar:title" content="..."> / <meta name="ar:description" content="...">
which this script preferentially reads.)
"""

from __future__ import annotations

import datetime
import re
import sys
import xml.sax.saxutils as sax
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "blog" / "posts"
BASE  = "https://mahmoodhamdi.github.io/cv"

TITLE_RE   = re.compile(r"<title[^>]*>([^<]+)</title>", re.I)
DESC_RE    = re.compile(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', re.I)
DATE_RE    = re.compile(r'"datePublished"\s*:\s*"([^"]+)"')
CAT_RE     = re.compile(r'data-category=["\']([^"\']+)["\']')
AR_TITLE_RE = re.compile(r'<meta\s+name=["\']ar:title["\']\s+content=["\']([^"\']+)["\']', re.I)
AR_DESC_RE  = re.compile(r'<meta\s+name=["\']ar:description["\']\s+content=["\']([^"\']+)["\']', re.I)
AR_H1_RE   = re.compile(r'<div[^>]+id=["\']ar-content["\'][^>]*>.*?<h1[^>]*>([^<]+)</h1>', re.I | re.S)
AR_LEAD_RE = re.compile(r'<div[^>]+id=["\']ar-content["\'][^>]*>.*?<p[^>]*>(.*?)</p>', re.I | re.S)


def clean_title(t: str) -> str:
    t = re.sub(r"<[^>]+>", "", t).strip()
    for sep in (" — Mahmoud Hamdy", " | Mahmoud Hamdy"):
        if t.endswith(sep):
            t = t[: -len(sep)]
    return t.strip()


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def parse_post(path: Path) -> dict | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    tm = TITLE_RE.search(text)
    dm = DESC_RE.search(text)
    if not tm:
        return None
    title = clean_title(tm.group(1))
    desc  = strip_html(dm.group(1)) if dm else ""

    # Date
    dt: datetime.datetime
    pub = DATE_RE.search(text)
    if pub:
        try:
            d = datetime.datetime.fromisoformat(pub.group(1).replace("Z", "+00:00"))
            dt = d.replace(tzinfo=datetime.timezone.utc) if d.tzinfo is None else d.astimezone(datetime.timezone.utc)
        except Exception:
            dt = datetime.datetime.fromtimestamp(path.stat().st_mtime, tz=datetime.timezone.utc)
    else:
        dt = datetime.datetime.fromtimestamp(path.stat().st_mtime, tz=datetime.timezone.utc)

    # Category
    cat_match = CAT_RE.search(text)
    category = (cat_match.group(1) if cat_match else "Article").title()

    # Arabic-side
    ar_title = AR_TITLE_RE.search(text)
    ar_desc  = AR_DESC_RE.search(text)
    if ar_title:
        ar_t = strip_html(ar_title.group(1))
    else:
        m = AR_H1_RE.search(text)
        ar_t = strip_html(m.group(1)) if m else title
    if ar_desc:
        ar_d = strip_html(ar_desc.group(1))
    else:
        m = AR_LEAD_RE.search(text)
        ar_d = strip_html(m.group(1))[:200] if m else desc

    return {
        "slug": path.stem,
        "title": title,
        "desc": desc,
        "ar_title": ar_t,
        "ar_desc": ar_d,
        "category": category,
        "date": dt,
    }


def render_feed(items: list[dict], lang: str, title: str, desc: str, link_suffix: str) -> str:
    """Build the RSS XML string."""
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
           '  <channel>',
           f'    <title>{sax.escape(title)}</title>',
           f'    <link>{BASE}/blog/</link>',
           f'    <description>{sax.escape(desc)}</description>',
           f'    <language>{lang}</language>',
           f'    <lastBuildDate>{now.strftime("%a, %d %b %Y %H:%M:%S +0000")}</lastBuildDate>',
           f'    <atom:link href="{BASE}/blog/{link_suffix}" rel="self" type="application/rss+xml"/>',
           '']
    for it in items:
        t = it["ar_title"] if lang == "ar" else it["title"]
        d = it["ar_desc"]  if lang == "ar" else it["desc"]
        url = f'{BASE}/blog/posts/{it["slug"]}.html'
        out.append('    <item>')
        out.append(f'      <title>{sax.escape(t)}</title>')
        out.append(f'      <link>{url}</link>')
        out.append(f'      <description>{sax.escape(d)}</description>')
        out.append(f'      <pubDate>{it["date"].strftime("%a, %d %b %Y %H:%M:%S +0000")}</pubDate>')
        out.append(f'      <category>{sax.escape(it["category"])}</category>')
        out.append(f'      <guid isPermaLink="true">{url}</guid>')
        out.append('    </item>')
        out.append('')
    out.append('  </channel>')
    out.append('</rss>')
    return "\n".join(out) + "\n"


def main() -> int:
    posts: list[dict] = []
    for p in sorted(POSTS.glob("*.html")):
        item = parse_post(p)
        if item:
            posts.append(item)
    if not posts:
        print("no posts found", file=sys.stderr); return 1

    # Sort newest first
    posts.sort(key=lambda x: x["date"], reverse=True)

    en = render_feed(
        posts, "en",
        title="Mahmoud Hamdy — Blog",
        desc="Technical articles on Node.js, Flutter, TypeScript, open source, and freelancing in the MENA region.",
        link_suffix="feed.xml",
    )
    ar = render_feed(
        posts, "ar",
        title="محمود حمدي — المدونة",
        desc="مقالات تقنية في Node.js و Flutter و TypeScript والمصادر المفتوحة والعمل الحر في منطقة الشرق الأوسط.",
        link_suffix="feed-ar.xml",
    )

    (ROOT / "blog" / "feed.xml").write_text(en, encoding="utf-8")
    (ROOT / "blog" / "feed-ar.xml").write_text(ar, encoding="utf-8")
    print(f"→ wrote blog/feed.xml and blog/feed-ar.xml ({len(posts)} items each)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
