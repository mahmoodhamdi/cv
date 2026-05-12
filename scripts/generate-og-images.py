#!/usr/bin/env python3
"""Generates 1200x630 OpenGraph images for the site.

Writes one PNG per page into assets/og/. Run after adding a new page
or changing a page title. The script is idempotent — re-running with
the same inputs produces the same bytes.

Usage:
    python3 scripts/generate-og-images.py

Adding a new image: extend the PAGES list at the bottom.
"""

from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "og"
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1200, 630

# Brand palette (matches site theme)
BG_TOP    = (10, 15, 26)       # --bg
BG_BOTTOM = (17, 24, 39)       # --bg-alt
ACCENT_A  = (56, 189, 248)     # --accent (sky)
ACCENT_B  = (129, 140, 248)    # --accent2 (indigo)
TXT       = (241, 245, 249)
TXT2      = (148, 163, 184)
MUTED     = (100, 116, 139)

FONT_REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def vertical_gradient(img: Image.Image, top: tuple, bottom: tuple) -> None:
    """Paint a vertical gradient on `img` in-place."""
    px = img.load()
    h = img.height
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(img.width):
            px[x, y] = (r, g, b, 255)


def soft_orb(img: Image.Image, cx: int, cy: int, radius: int, color: tuple, opacity: float = 0.18) -> None:
    """Approximate a CSS `filter: blur(80px)` orb by stacking translucent
    concentric circles of increasing radius and decreasing alpha."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 18
    for i in range(steps, 0, -1):
        ring_r = radius + (i - 1) * 14
        a = int(255 * opacity * (i / steps) ** 2 / steps)
        d.ellipse(
            (cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r),
            fill=(color[0], color[1], color[2], a),
        )
    img.alpha_composite(layer)


def draw_logo(img: Image.Image, cx: int, cy: int, size: int) -> None:
    """Draw the brand M-mark used as the avatar — same path geometry."""
    d = ImageDraw.Draw(img, "RGBA")
    half = size // 2
    # Rounded card background
    d.rounded_rectangle(
        (cx - half, cy - half, cx + half, cy + half),
        radius=size // 5,
        fill=(15, 23, 42, 255),
        outline=(99, 102, 241, 110),
        width=2,
    )
    # M-shape stroke from path "M30 82 L45 38 L60 65 L75 38 L90 82" inside 120x120 viewBox
    s = size / 120.0
    ox = cx - half
    oy = cy - half
    pts = [(30, 82), (45, 38), (60, 65), (75, 38), (90, 82)]
    coords = [(ox + p[0] * s, oy + p[1] * s) for p in pts]
    # Draw shadow then bright stroke
    for w, col in [(int(s * 8), (56, 189, 248, 80)), (int(s * 4.5), (56, 189, 248, 255))]:
        d.line(coords, fill=col, width=max(2, w), joint="curve")
    # Horizontal accent line
    d.line(
        [(ox + 38 * s, oy + 68 * s), (ox + 82 * s, oy + 68 * s)],
        fill=(56, 189, 248, 130),
        width=max(1, int(s * 1.5)),
    )


def wrap_lines(text: str, font: ImageFont.FreeTypeFont, max_width: int, max_lines: int = 3) -> list[str]:
    """Greedy word wrap. Falls back to character-split for long words."""
    if not text:
        return []
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        candidate = (cur + " " + w).strip()
        if font.getbbox(candidate)[2] <= max_width:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = w
        if len(lines) >= max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    # Truncate last line if overflow
    if len(lines) == max_lines and font.getbbox(lines[-1])[2] > max_width:
        while lines[-1] and font.getbbox(lines[-1] + "…")[2] > max_width:
            lines[-1] = lines[-1][:-1]
        lines[-1] += "…"
    return lines


def text_width(font: ImageFont.FreeTypeFont, text: str) -> int:
    return font.getbbox(text)[2] - font.getbbox(text)[0]


def render(title: str, subtitle: str, tag: str, out: Path) -> None:
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    vertical_gradient(img, BG_TOP, BG_BOTTOM)
    soft_orb(img, WIDTH - 120, 100, 180, ACCENT_A, 0.32)
    soft_orb(img, 80, HEIGHT - 80, 220, ACCENT_B, 0.28)
    soft_orb(img, WIDTH // 2 + 200, HEIGHT - 60, 140, (192, 132, 252), 0.18)

    d = ImageDraw.Draw(img, "RGBA")
    # Subtle grid lines (very faint so they read as texture, not lines)
    for y in range(0, HEIGHT, 80):
        d.line([(0, y), (WIDTH, y)], fill=(255, 255, 255, 3))
    for x in range(0, WIDTH, 80):
        d.line([(x, 0), (x, HEIGHT)], fill=(255, 255, 255, 3))

    # Logo (top-left)
    draw_logo(img, 100, 100, 120)

    # Tag pill (top-right) — small chip like "BLOG POST" or "PROJECT"
    if tag:
        tag_font = load_font(FONT_BOLD, 20)
        tag_text = tag.upper()
        tw = text_width(tag_font, tag_text)
        pad_x = 18
        pad_y = 12
        pill_h = 44
        x1 = WIDTH - 60 - (tw + pad_x * 2)
        y1 = 80
        x2 = WIDTH - 60
        y2 = y1 + pill_h
        d.rounded_rectangle((x1, y1, x2, y2), radius=22, fill=(15, 23, 42, 200), outline=(56, 189, 248, 160), width=2)
        d.text((x1 + pad_x, y1 + pill_h // 2 - 1), tag_text, font=tag_font, fill=ACCENT_A, anchor="lm")

    # Title — wrapped, large
    title_font = load_font(FONT_BOLD, 72)
    max_w = WIDTH - 120
    lines = wrap_lines(title, title_font, max_w, max_lines=3)
    if len(lines) > 2:
        title_font = load_font(FONT_BOLD, 58)
        lines = wrap_lines(title, title_font, max_w, max_lines=3)
    # Line height from font metrics
    asc, desc = title_font.getmetrics()
    line_h = asc + desc + 8
    # Center title vertically between logo and bottom band
    region_top = 240
    region_bottom = HEIGHT - 170
    block_h = line_h * len(lines)
    y = region_top + (region_bottom - region_top - block_h) // 3
    for line in lines:
        d.text((60, y), line, font=title_font, fill=TXT)
        y += line_h

    # Subtitle — smaller, secondary color
    if subtitle:
        sub_font = load_font(FONT_REG, 28)
        sub_lines = wrap_lines(subtitle, sub_font, max_w, max_lines=2)
        y += 8
        sub_asc, sub_desc = sub_font.getmetrics()
        for line in sub_lines:
            d.text((60, y), line, font=sub_font, fill=TXT2)
            y += sub_asc + sub_desc + 6

    # Bottom band — author + url
    band_y = HEIGHT - 100
    d.line([(60, band_y), (WIDTH - 60, band_y)], fill=(148, 163, 184, 40), width=1)
    name_font = load_font(FONT_BOLD, 22)
    role_font = load_font(FONT_REG, 16)
    url_font  = load_font(FONT_MONO, 20)
    d.text((60, band_y + 22), "Mahmoud Hamdy", font=name_font, fill=TXT)
    d.text((60, band_y + 56), "Full-Stack Developer · Egypt", font=role_font, fill=MUTED)
    d.text((WIDTH - 60, band_y + 32), "mahmoodhamdi.github.io/cv", font=url_font, fill=ACCENT_A, anchor="rt")

    img.convert("RGB").save(out, "PNG", optimize=True)


# ─── Page registry ──────────────────────────────────────────────────────────

PAGES: list[dict] = [
    # Top-level pages
    {"slug": "default",  "title": "Full-Stack Developer building for the MENA region",
     "subtitle": "Node.js · Flutter · Next.js · 500+ merged open-source PRs", "tag": ""},
    {"slug": "about",    "title": "The story — from CS student to OSS contributor",
     "subtitle": "How one merged pull request changed everything", "tag": "About"},
    {"slug": "services", "title": "Services & Pricing",
     "subtitle": "Transparent starting prices for full-stack work", "tag": "Services"},
    {"slug": "privacy",  "title": "Privacy Policy",
     "subtitle": "What this site collects and why", "tag": "Privacy"},
    {"slug": "blog",     "title": "Engineering notes from the MENA",
     "subtitle": "Tutorials on Node.js, Flutter, e-commerce automation", "tag": "Blog"},
    {"slug": "projects", "title": "Selected work — production projects",
     "subtitle": "SaaS platforms, mobile apps, and e-commerce automation", "tag": "Projects"},

    # Project pages
    {"slug": "project-escore",          "title": "Escore — Esports Platform",
     "subtitle": "Full-stack tournament management for the MENA gaming scene", "tag": "Project"},
    {"slug": "project-iai-salla-bot",   "title": "IAI — AI E-Commerce Assistant",
     "subtitle": "Salla-integrated AI customer support that closes sales", "tag": "Project"},
    {"slug": "project-wasalni",         "title": "Wasalni — Ride-Sharing Platform",
     "subtitle": "Driver + rider Flutter apps with real-time WebSocket tracking", "tag": "Project"},
    {"slug": "project-hadith-app",      "title": "Al-Arba'oon — Hadith App",
     "subtitle": "Published on Google Play with audio narration and full Arabic RTL", "tag": "Project"},
    {"slug": "project-clinic-booking",  "title": "Clinic Booking System",
     "subtitle": "Online appointments + doctor schedules + automated reminders", "tag": "Project"},
    {"slug": "project-whatsapp-bot",    "title": "WhatsApp Auto-Reply Bot",
     "subtitle": "No-code SaaS for automated WhatsApp business responses", "tag": "Project"},
    {"slug": "project-bagour-delivery", "title": "Bagour Delivery",
     "subtitle": "Hyperlocal delivery with three-sided marketplace + live tracking", "tag": "Project"},
    {"slug": "project-sana3y",          "title": "Sana3y — Handyman Marketplace",
     "subtitle": "On-demand verified craftsmen with real-time job dispatch", "tag": "Project"},

    # Blog posts (subtitles are short hooks)
    {"slug": "post-building-salla-bot",         "title": "Building an AI-Powered Salla Bot",
     "subtitle": "Node.js + Telegram + Salla webhooks for automated support", "tag": "Tutorial"},
    {"slug": "post-flutter-clean-architecture", "title": "Flutter Clean Architecture in Practice",
     "subtitle": "Domain · data · presentation layers with Bloc, the way I actually use it", "tag": "Tutorial"},
    {"slug": "post-nodejs-typescript-best-practices", "title": "Node.js + TypeScript Best Practices",
     "subtitle": "Project layout, error handling, and the patterns that scale", "tag": "Tutorial"},
    {"slug": "post-open-source-contributions-journey", "title": "My Open Source Journey",
     "subtitle": "From first fix to 500+ merged PRs across the Node.js ecosystem", "tag": "Story"},
    {"slug": "post-mena-freelance-guide",       "title": "The MENA Freelance Guide",
     "subtitle": "Pricing, contracts, and clients in the Arab market", "tag": "Guide"},
    {"slug": "post-salla-store-automation",     "title": "Complete Guide to Salla Store Automation",
     "subtitle": "Webhooks, scheduled jobs, and inventory sync end to end", "tag": "Tutorial"},
    {"slug": "post-zid-vs-salla-comparison",    "title": "Salla vs Zid: Complete Comparison",
     "subtitle": "Features, pricing, APIs, and which to pick for your store", "tag": "Guide"},
    {"slug": "post-whatsapp-business-bot-guide", "title": "Building a WhatsApp Business Bot",
     "subtitle": "Cloud API, webhooks, and auto-replies that handle real customers", "tag": "Tutorial"},
    {"slug": "post-telegram-bot-nodejs-tutorial", "title": "Telegram Bot with Node.js",
     "subtitle": "From webhook setup to a production-ready bot", "tag": "Tutorial"},
    {"slug": "post-nextjs-arabic-website",      "title": "Building an Arabic Next.js Website",
     "subtitle": "RTL, fonts, and the gotchas nobody warns you about", "tag": "Tutorial"},
    {"slug": "post-flutter-app-from-scratch",   "title": "Flutter App From Scratch",
     "subtitle": "A pragmatic walk from `flutter create` to Play Store", "tag": "Tutorial"},
    {"slug": "post-nodejs-rest-api-complete-guide", "title": "Complete Node.js REST API Guide",
     "subtitle": "Auth, validation, error handling, deployment", "tag": "Tutorial"},
    {"slug": "post-react-dashboard-tutorial",   "title": "Building a React Admin Dashboard",
     "subtitle": "Tables, charts, and clean state with Zustand", "tag": "Tutorial"},
    {"slug": "post-mongodb-vs-postgresql",      "title": "MongoDB vs PostgreSQL",
     "subtitle": "How I pick between document and relational for real projects", "tag": "Guide"},
    {"slug": "post-docker-deployment-guide",    "title": "Docker Deployment Guide",
     "subtitle": "From Dockerfile to production with zero-downtime", "tag": "Tutorial"},
    {"slug": "post-freelancing-pricing-arabic", "title": "Freelance Pricing in the Arab Market",
     "subtitle": "Hourly, fixed, retainer — and when to use each", "tag": "Guide"},
    {"slug": "post-ecommerce-arabic-market-2026", "title": "E-commerce in the Arabic Market 2026",
     "subtitle": "What's growing, what's saturated, where to build", "tag": "Guide"},
    {"slug": "post-ai-chatbot-business-guide",  "title": "Building an AI Chatbot for Your Business",
     "subtitle": "From conversation design to deployment", "tag": "Guide"},
    {"slug": "post-payment-integration-mena",   "title": "Payment Integration in the MENA",
     "subtitle": "PayMob, Fawry, HyperPay, Stripe — what works and what hurts", "tag": "Guide"},
    {"slug": "post-mobile-app-cost-guide",      "title": "Mobile App Cost Guide",
     "subtitle": "Honest pricing for Flutter apps in 2026", "tag": "Guide"},
    {"slug": "post-website-speed-optimization", "title": "Website Speed Optimization",
     "subtitle": "Lighthouse 100s without sacrificing features", "tag": "Tutorial"},
    {"slug": "post-github-portfolio-developer", "title": "Your GitHub Profile as a Portfolio",
     "subtitle": "What hiring managers actually look at", "tag": "Story"},
    {"slug": "post-saas-mvp-build-guide",       "title": "Building Your First SaaS MVP",
     "subtitle": "Auth, billing, tenant isolation — the boring-but-critical parts", "tag": "Guide"},
    {"slug": "post-api-integration-beginners",  "title": "API Integration for Beginners",
     "subtitle": "How to read docs, handle errors, and not get rate-limited", "tag": "Tutorial"},
    {"slug": "post-cybersecurity-basics-arabic", "title": "Cybersecurity Basics for Developers",
     "subtitle": "OWASP top 10 and the threats you'll actually face", "tag": "Guide"},
]


def main() -> int:
    for page in PAGES:
        out = OUT_DIR / f"og-{page['slug']}.png"
        try:
            render(page["title"], page["subtitle"], page.get("tag", ""), out)
            print(f"✓ {out.relative_to(ROOT)}")
        except Exception as e:
            print(f"✗ {page['slug']}: {e}", file=sys.stderr)
            return 1
    print(f"\nGenerated {len(PAGES)} OG images in {OUT_DIR.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
