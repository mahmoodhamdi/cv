#!/usr/bin/env python3
"""Rewrites sw.js — refreshes the ASSETS array and bumps CACHE_NAME
to a content hash so returning visitors don't keep stale assets.

The cache name format is: mahmoud-cv-<short-hash>
Where short-hash is the first 8 chars of sha256(sorted asset list +
their content hashes). Same inputs → same hash, so re-running this
without changes is a no-op.
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / "sw.js"

# Paths under ROOT that should be cached. Order doesn't matter — the
# generated list is sorted for stability.
PATTERNS = [
    "index.html",
    "about.html",
    "services.html",
    "manifest.json",
    "404.html",
    "css/bundle.css",
    "css/sections.css",
    "css/utilities.css",
    "js/main.js",
    "js/utils.js",
    "js/theme.js",
    "js/language.js",
    "js/navigation.js",
    "js/animations.js",
    "js/analytics.js",
    "js/contact.js",
    "js/pwa.js",
    "js/github-stats.js",
    "js/blog-enhance.js",
    "js/search.js",
    "data/stats.json",
    "data/search-index.json",
    "about.html",
    "services.html",
    "privacy.html",
    "assets/favicon.svg",
    "assets/icon-192.svg",
    "assets/icon-512.svg",
    "projects/projects.css",
]

GLOB_PATTERNS = [
    "projects/*.html",
    "blog/*.html",
    "blog/*.css",
    "blog/posts/*.html",
]


def collect() -> list[Path]:
    out: list[Path] = []
    seen: set[Path] = set()
    for p in PATTERNS:
        full = ROOT / p
        if full.is_file() and full not in seen:
            seen.add(full); out.append(full)
    for pat in GLOB_PATTERNS:
        for f in ROOT.glob(pat):
            if f.is_file() and f not in seen:
                seen.add(f); out.append(f)
    return sorted(out)


def short_hash(paths: list[Path]) -> str:
    h = hashlib.sha256()
    for p in paths:
        rel = p.relative_to(ROOT).as_posix()
        h.update(rel.encode())
        h.update(b"|")
        try:
            h.update(hashlib.sha256(p.read_bytes()).digest())
        except Exception:
            pass
        h.update(b"\n")
    return h.hexdigest()[:8]


def rewrite_sw(paths: list[Path], cache_name: str) -> str:
    sw = SW.read_text(encoding="utf-8")

    # Bump CACHE_NAME
    sw = re.sub(
        r"const\s+CACHE_NAME\s*=\s*['\"][^'\"]+['\"]\s*;",
        f"const CACHE_NAME = '{cache_name}';",
        sw,
        count=1,
    )

    # Rewrite the ASSETS array
    rels = ["./" + p.relative_to(ROOT).as_posix() for p in paths]
    if "./index.html" in rels and "./" not in rels:
        rels.insert(0, "./")
    body = ",\n  ".join(f"'{r}'" for r in rels)
    new_block = f"const ASSETS = [\n  {body}\n];"
    sw = re.sub(
        r"const\s+ASSETS\s*=\s*\[[^\]]*\];",
        new_block,
        sw,
        count=1,
        flags=re.S,
    )
    return sw


def main() -> int:
    if not SW.exists():
        print(f"missing {SW}", file=sys.stderr); return 1
    paths = collect()
    if not paths:
        print("no assets found", file=sys.stderr); return 1
    cache_name = f"mahmoud-cv-{short_hash(paths)}"
    new_sw = rewrite_sw(paths, cache_name)
    if new_sw == SW.read_text(encoding="utf-8"):
        print(f"✓ sw.js up to date (cache: {cache_name})")
        return 0
    SW.write_text(new_sw, encoding="utf-8")
    print(f"→ wrote sw.js with {len(paths)} assets, cache: {cache_name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
