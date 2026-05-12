#!/usr/bin/env python3
"""Render the brand mark as raster PNGs at standard favicon sizes.

The SVG version (assets/favicon.svg) stays as the canonical source.
This script produces:
  - assets/favicon-16.png
  - assets/favicon-32.png
  - assets/apple-touch-icon.png   (180x180)
  - assets/icon-192.png
  - assets/icon-512.png
"""
from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets"

# Canvas geometry mirrors the SVG viewBox "0 0 120 120"
CARD_BG       = (15, 23, 42, 255)        # #0f172a
CARD_BORDER   = (99, 102, 241, 102)      # rgba(99,102,241,0.4)
STROKE_START  = (56, 189, 248, 255)      # #38bdf8
STROKE_END    = (129, 140, 248, 255)     # #818cf8
ACCENT_LINE   = (56, 189, 248, 128)      # rgba(56,189,248,0.5)


def lerp(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(len(a)))


def draw_logo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    s = size / 120.0  # scale factor from SVG units

    # Rounded card background
    corner = int(26 * s)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=corner, fill=CARD_BG)
    # Border
    inset = int(4 * s)
    inner_corner = max(1, int(24 * s))
    d.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=inner_corner, outline=CARD_BORDER, width=max(1, int(1.5 * s)),
    )

    # The "M" path: 5 points in SVG coords
    pts = [(30, 82), (45, 38), (60, 65), (75, 38), (90, 82)]
    scaled = [(p[0] * s, p[1] * s) for p in pts]

    # Approximate the gradient by drawing the path as a sequence of short
    # segments, each with an interpolated colour between STROKE_START and
    # STROKE_END (since PIL doesn't natively gradient-stroke a polyline).
    segments_per_edge = 20
    stroke_w = max(2, int(4.5 * s))
    flat: list[tuple[float, float, float, float, float]] = []  # x1,y1,x2,y2,t
    total_len = 0.0
    # Compute total length first
    edge_lengths: list[float] = []
    for i in range(len(scaled) - 1):
        a, b = scaled[i], scaled[i + 1]
        L = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
        edge_lengths.append(L)
        total_len += L

    cumulative = 0.0
    for ei in range(len(scaled) - 1):
        a, b = scaled[ei], scaled[ei + 1]
        L = edge_lengths[ei]
        for j in range(segments_per_edge):
            t1 = (cumulative + (j / segments_per_edge) * L) / total_len
            t2 = (cumulative + ((j + 1) / segments_per_edge) * L) / total_len
            x1 = a[0] + (b[0] - a[0]) * (j / segments_per_edge)
            y1 = a[1] + (b[1] - a[1]) * (j / segments_per_edge)
            x2 = a[0] + (b[0] - a[0]) * ((j + 1) / segments_per_edge)
            y2 = a[1] + (b[1] - a[1]) * ((j + 1) / segments_per_edge)
            flat.append((x1, y1, x2, y2, (t1 + t2) / 2))
        cumulative += L

    for x1, y1, x2, y2, t in flat:
        col = lerp(STROKE_START, STROKE_END, t)
        d.line([(x1, y1), (x2, y2)], fill=col, width=stroke_w)

    # Caps (round): draw a circle at each vertex
    for (x, y) in scaled:
        r = stroke_w / 2
        d.ellipse(
            (x - r, y - r, x + r, y + r),
            fill=STROKE_START if (x, y) == scaled[0] else STROKE_END if (x, y) == scaled[-1] else lerp(STROKE_START, STROKE_END, 0.5),
        )

    # Horizontal accent line (rgba(56,189,248,0.5)) from x=38 to x=82 at y=68
    line_w = max(1, int(1.5 * s))
    d.line([(38 * s, 68 * s), (82 * s, 68 * s)], fill=ACCENT_LINE, width=line_w)

    return img


SIZES = [
    ("favicon-16.png",         16),
    ("favicon-32.png",         32),
    ("apple-touch-icon.png",  180),
    ("icon-192.png",          192),
    ("icon-512.png",          512),
]


def main() -> int:
    for filename, size in SIZES:
        # Render at 2x then downscale for crisper edges
        big = draw_logo(size * 2)
        small = big.resize((size, size), Image.LANCZOS)
        small.convert("RGB").save(OUT_DIR / filename, "PNG", optimize=True)
        print(f"✓ assets/{filename} ({size}x{size})")
    print(f"\nGenerated {len(SIZES)} favicon variants.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
