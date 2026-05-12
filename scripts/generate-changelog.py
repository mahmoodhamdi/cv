#!/usr/bin/env python3
"""Generates changelog.html from `git log` of the repo.

Parses Conventional Commits (feat:, fix:, chore:, docs:, refactor:, etc.)
and groups commits by month, with type pills for filtering.

Output: changelog.html at the repo root.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "changelog.html"

BASE_URL = "https://mahmoodhamdi.github.io/cv"
GH_REPO  = "https://github.com/mahmoodhamdi/cv"

CONV_RE = re.compile(r"^(?P<type>feat|fix|chore|docs|refactor|test|perf|style|build|ci|revert)(?:\([^)]+\))?:\s*(?P<summary>.+)$")

TYPE_META = {
    "feat":     {"label": "feat",     "color": "#34d399", "bg": "rgba(52,211,153,.12)"},
    "fix":      {"label": "fix",      "color": "#fb7185", "bg": "rgba(251,113,133,.12)"},
    "chore":    {"label": "chore",    "color": "#94a3b8", "bg": "rgba(148,163,184,.12)"},
    "docs":     {"label": "docs",     "color": "#a78bfa", "bg": "rgba(167,139,250,.12)"},
    "refactor": {"label": "refactor", "color": "#38bdf8", "bg": "rgba(56,189,248,.12)"},
    "test":     {"label": "test",     "color": "#fbbf24", "bg": "rgba(251,191,36,.12)"},
    "perf":     {"label": "perf",     "color": "#22d3ee", "bg": "rgba(34,211,238,.12)"},
    "style":    {"label": "style",    "color": "#f472b6", "bg": "rgba(244,114,182,.12)"},
    "build":    {"label": "build",    "color": "#94a3b8", "bg": "rgba(148,163,184,.12)"},
    "ci":       {"label": "ci",       "color": "#94a3b8", "bg": "rgba(148,163,184,.12)"},
    "revert":   {"label": "revert",   "color": "#94a3b8", "bg": "rgba(148,163,184,.12)"},
    "other":    {"label": "other",    "color": "#94a3b8", "bg": "rgba(148,163,184,.12)"},
}

MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]
MONTH_NAMES_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


def run(*args: str) -> str:
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, check=True).stdout


def parse_commits() -> list[dict]:
    raw = run("git", "log", "--no-merges", "--pretty=format:%H||%cs||%s")
    commits: list[dict] = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            sha, date_str, subject = line.split("||", 2)
        except ValueError:
            continue
        m = CONV_RE.match(subject)
        if m:
            ctype = m.group("type")
            summary = m.group("summary").strip()
        else:
            ctype = "other"
            summary = subject.strip()
        # Skip noisy auto-commits
        if "[skip ci]" in summary:
            continue
        try:
            d = datetime.fromisoformat(date_str)
        except ValueError:
            continue
        commits.append({
            "sha": sha[:7],
            "date": d,
            "type": ctype,
            "summary": summary,
        })
    return commits


def escape_html(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )


def build_html(commits: list[dict]) -> str:
    # Group by year-month
    groups: "OrderedDict[tuple[int, int], list[dict]]" = OrderedDict()
    for c in commits:
        key = (c["date"].year, c["date"].month)
        groups.setdefault(key, []).append(c)

    type_counts: dict[str, int] = {}
    for c in commits:
        type_counts[c["type"]] = type_counts.get(c["type"], 0) + 1

    # Render type filter pills
    pills_html = '<button class="cl-pill on" data-type="all"><span class="en-only">All</span><span class="ar-only" style="display:none">الكل</span> <span class="cl-count">' + str(len(commits)) + '</span></button>'
    for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        meta = TYPE_META.get(t, TYPE_META["other"])
        pills_html += (
            f'<button class="cl-pill" data-type="{t}" style="--c:{meta["color"]};--bg:{meta["bg"]}">'
            f'{meta["label"]} <span class="cl-count">{count}</span></button>'
        )

    # Render groups
    groups_html_parts: list[str] = []
    for (year, month), items in groups.items():
        month_label_en = f"{MONTH_NAMES[month-1]} {year}"
        month_label_ar = f"{MONTH_NAMES_AR[month-1]} {year}"
        group_anchor = f"{year}-{month:02d}"
        rows_html = ""
        for c in items:
            meta = TYPE_META.get(c["type"], TYPE_META["other"])
            date_short = c["date"].strftime("%b %d")
            rows_html += (
                f'<li class="cl-item" data-type="{c["type"]}">'
                f'<span class="cl-date">{date_short}</span>'
                f'<span class="cl-type" style="--c:{meta["color"]};--bg:{meta["bg"]}">{meta["label"]}</span>'
                f'<span class="cl-msg">{escape_html(c["summary"])}</span>'
                f'<a class="cl-sha" href="{GH_REPO}/commit/{c["sha"]}" target="_blank" rel="noopener">{c["sha"]}</a>'
                f'</li>'
            )
        groups_html_parts.append(
            f'<section class="cl-group" id="{group_anchor}">'
            f'<h2 class="cl-month"><span class="en-only">{month_label_en}</span><span class="ar-only" style="display:none">{month_label_ar}</span> <span class="cl-month-count">{len(items)}</span></h2>'
            f'<ul class="cl-list">{rows_html}</ul>'
            f'</section>'
        )
    groups_html = "\n".join(groups_html_parts)

    # JSON-LD breadcrumb
    breadcrumb = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Changelog", "item": f"{BASE_URL}/changelog.html"},
        ],
    }, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Changelog — Mahmoud Hamdy</title>
<meta name="description" content="Every change shipped to mahmoodhamdi.github.io/cv — grouped by month, auto-generated from git history.">
<meta name="author" content="Mahmoud Hamdy">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0f1a">
<link rel="canonical" href="{BASE_URL}/changelog.html">
<meta property="og:type" content="website">
<meta property="og:title" content="Changelog — Mahmoud Hamdy">
<meta property="og:description" content="Every change shipped to this portfolio, grouped by month.">
<meta property="og:url" content="{BASE_URL}/changelog.html">
<meta property="og:image" content="{BASE_URL}/assets/og/og-changelog.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{BASE_URL}/assets/og/og-changelog.png">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="manifest" href="./manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<script type="application/ld+json">
{breadcrumb}
</script>
<style>
:root{{--bg:#0a0f1a;--bg-alt:#111827;--card:#1a2236;--accent:#38bdf8;--accent-g:rgba(56,189,248,.15);--accent2:#818cf8;--txt:#f1f5f9;--txt2:#94a3b8;--muted:#8e99ad;--bdr:rgba(148,163,184,.1);--grad:linear-gradient(135deg,#38bdf8,#818cf8);--fn:'Outfit',sans-serif;--mono:'JetBrains Mono',monospace;--fn-ar:'Tajawal',sans-serif;--nav-bg:rgba(10,15,26,.88)}}
*{{margin:0;padding:0;box-sizing:border-box}}html{{scroll-behavior:smooth}}
body{{font-family:var(--fn);background:var(--bg);color:var(--txt);line-height:1.6;overflow-x:hidden;padding-top:52px}}
.wrap{{max-width:900px;margin:0 auto;padding:30px 24px}}
.navbar{{position:fixed;top:0;left:0;right:0;z-index:90;background:var(--nav-bg);backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr)}}
.nav-in{{max-width:1100px;margin:0 auto;padding:0 24px;display:flex;align-items:center;height:48px}}
.nav-back{{font-size:13px;color:var(--muted);text-decoration:none;display:inline-flex;align-items:center;gap:6px}}
.nav-back:hover{{color:var(--accent)}}
.nav-back svg{{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}}
.top-ctrl{{position:fixed;top:58px;right:20px;z-index:100;display:flex;gap:8px;align-items:center}}
.lang-tog{{display:flex;gap:3px;background:var(--card);border:1px solid var(--bdr);border-radius:10px;padding:3px}}
.l-btn{{padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;border:none;background:none;font-family:var(--fn)}}
.l-btn.on{{background:var(--accent-g);color:var(--accent)}}
.cl-hero{{margin-bottom:20px}}
.cl-hero h1{{font-size:36px;font-weight:600;letter-spacing:-.02em;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}}
.cl-hero p{{font-size:14px;color:var(--txt2)}}
.cl-pills{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px}}
.cl-pill{{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid var(--bdr);background:transparent;color:var(--txt2);font-family:var(--fn);font-size:12px;font-weight:500;cursor:pointer;transition:all .2s}}
.cl-pill[data-type]:not([data-type="all"]) {{color:var(--c,var(--accent))}}
.cl-pill:hover{{border-color:var(--c,var(--accent));background:var(--bg,transparent)}}
.cl-pill.on{{border-color:var(--c,var(--accent));background:var(--bg,var(--accent-g));color:var(--c,var(--accent))}}
.cl-pill[data-type="all"].on{{background:var(--grad);color:#fff;border-color:transparent}}
.cl-count{{font-family:var(--mono);font-size:10px;opacity:.7}}
.cl-group{{margin-bottom:30px}}
.cl-month{{font-size:18px;font-weight:600;color:var(--txt);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--bdr);display:flex;align-items:baseline;gap:10px}}
.cl-month-count{{font-family:var(--mono);font-size:11px;color:var(--muted);font-weight:500}}
.cl-list{{list-style:none;display:flex;flex-direction:column;gap:6px}}
.cl-item{{display:grid;grid-template-columns:60px auto 1fr auto;gap:12px;align-items:center;padding:10px 14px;background:var(--card);border:1px solid var(--bdr);border-radius:10px;transition:border-color .2s,transform .2s}}
.cl-item:hover{{border-color:var(--accent);transform:translateX(2px)}}
html[dir="rtl"] .cl-item:hover{{transform:translateX(-2px)}}
.cl-date{{font-family:var(--mono);font-size:11px;color:var(--muted)}}
.cl-type{{font-family:var(--mono);font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;background:var(--bg,var(--accent-g));color:var(--c,var(--accent));text-transform:uppercase;letter-spacing:.04em;text-align:center}}
.cl-msg{{font-size:13.5px;color:var(--txt2);line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.cl-sha{{font-family:var(--mono);font-size:11px;color:var(--muted);text-decoration:none;padding:2px 6px;border-radius:4px;transition:color .2s,background .2s}}
.cl-sha:hover{{color:var(--accent);background:var(--accent-g)}}
.cl-empty{{padding:30px;text-align:center;color:var(--muted);font-size:13px}}
html[data-theme="light"]{{--bg:#f8fafc;--bg-alt:#f1f5f9;--card:#fff;--txt:#0f172a;--txt2:#334155;--muted:#64748b;--bdr:rgba(15,23,42,.1);--nav-bg:rgba(248,250,252,.88);--accent-g:rgba(56,189,248,.12)}}
html[dir="rtl"] body{{font-family:var(--fn-ar)}}
@media(max-width:600px){{
  .cl-hero h1{{font-size:28px}}
  .top-ctrl{{top:54px;right:12px}}
  html[dir="rtl"] .top-ctrl{{right:auto;left:12px}}
  .cl-item{{grid-template-columns:auto 1fr;row-gap:4px}}
  .cl-date{{order:1}}
  .cl-type{{order:2;justify-self:end}}
  .cl-msg{{grid-column:1 / -1;order:3;white-space:normal}}
  .cl-sha{{grid-column:1 / -1;order:4;justify-self:start;margin-top:4px}}
}}
</style>
<link rel="stylesheet" href="css/bundle.css">
</head>
<body class="loaded">

<nav class="navbar"><div class="nav-in">
  <a href="./" class="nav-back"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
    <span class="en-only">Back to portfolio</span><span class="ar-only" style="display:none">العودة للبورتفوليو</span>
  </a>
</div></nav>

<div class="top-ctrl">
  <div class="lang-tog">
    <button class="l-btn on" onclick="setLang('en')">EN</button>
    <button class="l-btn" onclick="setLang('ar')">عربي</button>
  </div>
</div>

<main class="wrap">

<section class="cl-hero">
  <h1 id="hero-en">Changelog</h1>
  <h1 id="hero-ar" style="display:none">سجل التغييرات</h1>
  <p id="sub-en">Every change shipped to this portfolio, grouped by month. Auto-generated from git history — last refreshed {datetime.now().strftime('%Y-%m-%d')}.</p>
  <p id="sub-ar" style="display:none">كل تغيير اتشحن على البورتفوليو ده، مجمّع بالشهر. مولّد تلقائياً من تاريخ git — آخر تحديث {datetime.now().strftime('%Y-%m-%d')}.</p>
</section>

<div class="cl-pills" id="filters" role="group" aria-label="Filter by commit type">
  {pills_html}
</div>

<div id="cl-content">
  {groups_html}
</div>

<div class="cl-empty" id="cl-empty" style="display:none">
  <span class="en-only">No commits of this type.</span>
  <span class="ar-only" style="display:none">مفيش commits بالنوع ده.</span>
</div>

</main>

<script>
try{{var t=localStorage.getItem('cv-theme');if(t)document.documentElement.setAttribute('data-theme',t)}}catch(e){{}}
function setLang(l){{
  var h=document.documentElement;
  var btns=document.querySelectorAll('.l-btn');
  var isAr=l==='ar';
  h.dir=isAr?'rtl':'ltr';h.lang=l;
  btns[0].classList.toggle('on',!isAr);btns[1].classList.toggle('on',isAr);
  document.querySelectorAll('.en-only').forEach(function(el){{el.style.display=isAr?'none':''}});
  document.querySelectorAll('.ar-only').forEach(function(el){{el.style.display=isAr?'inline':'none'}});
  document.getElementById('hero-en').style.display=isAr?'none':'';
  document.getElementById('hero-ar').style.display=isAr?'':'none';
  document.getElementById('sub-en').style.display=isAr?'none':'';
  document.getElementById('sub-ar').style.display=isAr?'':'none';
}}

document.getElementById('filters').addEventListener('click', function(e) {{
  var btn = e.target.closest('.cl-pill');
  if (!btn) return;
  document.querySelectorAll('.cl-pill').forEach(function(b) {{ b.classList.remove('on'); }});
  btn.classList.add('on');
  var t = btn.dataset.type;
  var anyVisible = false;
  document.querySelectorAll('.cl-item').forEach(function(item) {{
    var show = t === 'all' || item.dataset.type === t;
    item.style.display = show ? '' : 'none';
    if (show) anyVisible = true;
  }});
  // Hide groups with no visible items
  document.querySelectorAll('.cl-group').forEach(function(g) {{
    var visible = g.querySelectorAll('.cl-item:not([style*="none"])').length;
    g.style.display = visible ? '' : 'none';
  }});
  document.getElementById('cl-empty').style.display = anyVisible ? 'none' : 'block';
}});
</script>
<script src="js/search.js" defer></script>
</body>
</html>
"""


def main() -> int:
    commits = parse_commits()
    if not commits:
        print("no commits found", file=sys.stderr); return 1
    html = build_html(commits)
    OUT.write_text(html, encoding="utf-8")
    by_type: dict[str, int] = {}
    for c in commits:
        by_type[c["type"]] = by_type.get(c["type"], 0) + 1
    print(f"→ wrote {OUT.relative_to(ROOT)} with {len(commits)} commits, types: {by_type}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
