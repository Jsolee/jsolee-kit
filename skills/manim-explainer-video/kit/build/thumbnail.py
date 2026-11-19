#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build/thumbnail.py — one thumbnail style for a video or a whole series (1280x720 PNG, Pillow only).

    python build/thumbnail.py --part 1 --hook "WHAT IS|*UTILITY?*" \
        --subtitle "von Neumann–Morgenstern theorem" --motif simplex --out thumb.png
    python build/thumbnail.py --sheet            # contact sheet of every motif

Fixed across the series (do not change per video): charcoal #0e1117 background with a faint grid, the
badge "SERIES NAME [NN]" top-left (no number for a standalone video), the hook in Latin Modern Roman Bold on the left (the *starred* word is
yellow), the subtitle in blue under it, and a glowing geometric motif on the right in the video palette.
Only the hook, subtitle, motif and part number change.

Motifs: simplex, payoff, curve, tree, network, bipartite.
"""
from __future__ import annotations

import argparse
import glob
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, S = 1280, 720, 2            # output size and supersampling factor
BG = (14, 17, 23)
GRID = (28, 36, 48)
BLUE, GREEN, YELLOW, PINK = (59, 130, 246), (16, 185, 129), (251, 191, 36), (244, 63, 94)
WHITE, GREY = (243, 244, 246), (156, 163, 175)
ACCENTS = {"yellow": YELLOW, "blue": BLUE, "green": GREEN, "pink": PINK}
CX, CY = 975, 385                  # centre of the motif area


# ----------------------------------------------------------------------------- fonts
def find_font(names, size, index=0):
    size = int(size * S)          # sizes are nominal pixels of the 1280x720 output
    pats = []
    for n in names:
        pats += [f"/usr/share/texmf/fonts/opentype/public/lm/{n}",
                 f"/usr/local/texlive/*/texmf-dist/fonts/opentype/public/lm/{n}",
                 f"/usr/share/texlive/texmf-dist/fonts/opentype/public/lm/{n}",
                 f"/opt/homebrew/share/texlive/texmf-dist/fonts/opentype/public/lm/{n}",
                 f"/Library/TeX/Root/texmf-dist/fonts/opentype/public/lm/{n}"]
    for p in pats:
        hits = glob.glob(p)
        if hits:
            return ImageFont.truetype(hits[0], size, index=index)
    for f in ["/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
              "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"]:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def bold(size):
    return find_font(["lmroman10-bold.otf"], size)


def regular(size):
    return find_font(["lmroman10-regular.otf", "lmroman10-bold.otf"], size)


# ----------------------------------------------------------------------------- drawing helpers
def sc(v):
    return [(x * S, y * S) if isinstance(x, (int, float)) else x for x, y in [v]][0] if isinstance(v, tuple) else v * S


def P(x, y):
    return (x * S, y * S)


def line(d, a, b, col, w=3, alpha=255):
    d.line([P(*a), P(*b)], fill=col + (alpha,), width=int(w * S))


def dot(d, c, r, col, alpha=255):
    x, y = P(*c)
    d.ellipse([x - r * S, y - r * S, x + r * S, y + r * S], fill=col + (alpha,))


def ring(d, c, r, col, w=3, alpha=255):
    x, y = P(*c)
    d.ellipse([x - r * S, y - r * S, x + r * S, y + r * S], outline=col + (alpha,), width=int(w * S))


def arrow(d, a, b, col, w=5, head=22, alpha=255):
    line(d, a, b, col, w, alpha)
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    for s in (-0.45, 0.45):
        line(d, b, (b[0] - head * math.cos(ang + s), b[1] - head * math.sin(ang + s)), col, w, alpha)


def text_c(d, c, s, font, col, alpha=255):
    d.text(P(*c), s, font=font, fill=col + (alpha,), anchor="mm")


# ----------------------------------------------------------------------------- motifs (each draws on an RGBA layer)
def simplex(d):
    s = 440
    h = s * math.sqrt(3) / 2
    Wv, Bv, Mv = (CX - s / 2, CY + h / 3), (CX + s / 2, CY + h / 3), (CX, CY - 2 * h / 3)
    u = (0.0, 0.7, 1.0)
    for a, b in ((Wv, Mv), (Mv, Bv), (Wv, Bv)):
        line(d, a, b, GREY, 4)
    verts = [Wv, Mv, Bv]
    for k in range(1, 9):
        c = u[0] + (u[2] - u[0]) * k / 9
        pts = []
        for i, j in ((0, 1), (1, 2), (0, 2)):
            if abs(u[j] - u[i]) < 1e-9:
                continue
            t = (c - u[i]) / (u[j] - u[i])
            if -1e-9 <= t <= 1 + 1e-9:
                q = ((1 - t) * verts[i][0] + t * verts[j][0], (1 - t) * verts[i][1] + t * verts[j][1])
                if all(math.dist(q, o) > 1e-6 for o in pts):
                    pts.append(q)
        if len(pts) >= 2:
            line(d, pts[0], pts[1], YELLOW, 3, 200)
    # gradient: direction of increasing expected utility
    e1, e2 = (Mv[0] - Wv[0], Mv[1] - Wv[1]), (Bv[0] - Wv[0], Bv[1] - Wv[1])
    det = e1[0] * e2[1] - e1[1] * e2[0]
    r1, r2 = u[1] - u[0], u[2] - u[0]
    gx = (r1 * e2[1] - r2 * e1[1]) / det
    gy = (e1[0] * r2 - e2[0] * r1) / det
    n = math.hypot(gx, gy)
    c0 = ((Wv[0] + Mv[0] + Bv[0]) / 3, (Wv[1] + Mv[1] + Bv[1]) / 3)
    arrow(d, (c0[0] - 70 * gx / n, c0[1] - 70 * gy / n), (c0[0] + 80 * gx / n, c0[1] + 80 * gy / n), WHITE, 7, 26)
    for v, col in zip((Wv, Mv, Bv), (PINK, YELLOW, GREEN)):
        dot(d, v, 13, col)


CURRENT_ACCENT = YELLOW   # the payoff motif colours the equilibrium cell in the video's accent


def payoff(d):
    x0, y0, cw, ch, gap = CX - 215, CY - 165, 205, 160, 14
    GREEN = CURRENT_ACCENT   # local alias: the highlighted cell takes the accent colour
    cells = [("3,3", BLUE), ("0,5", GREY), ("5,0", GREY), ("1,1", GREEN)]
    for i, (txt, col) in enumerate(cells):
        r, c = divmod(i, 2)
        x, y = x0 + c * (cw + gap), y0 + r * (ch + gap)
        d.rounded_rectangle([P(x, y), P(x + cw, y + ch)], radius=18 * S, outline=col + (255,), width=(7 if col == GREEN else 3) * S,
                            fill=(GREEN + (40,) if col == GREEN else (255, 255, 255, 0)))
        a, b = txt.split(",")
        f = bold(64)
        text_c(d, (x + cw * 0.3, y + ch * 0.5), a, f, BLUE)
        text_c(d, (x + cw * 0.7, y + ch * 0.5), b, f, PINK)
    for k in range(2):
        text_c(d, (x0 - 34, y0 + ch / 2 + k * (ch + gap)), ("A", "B")[k], regular(44), GREY)
        text_c(d, (x0 + cw / 2 + k * (cw + gap), y0 - 36), ("C", "D")[k], regular(44), GREY)
    ring(d, (x0 + cw + gap + cw / 2, y0 + ch + gap + ch / 2), 118, GREEN, 3, 120)


def curve(d):
    ox, oy, wx, wy = CX - 230, CY + 190, 470, 380
    arrow(d, (ox, oy), (ox + wx, oy), GREY, 4, 16)
    arrow(d, (ox, oy), (ox, oy - wy), GREY, 4, 16)
    pts = [(ox + wx * 0.92 * t / 100, oy - wy * 0.92 * math.sqrt(t / 100)) for t in range(0, 101)]
    for a, b in zip(pts, pts[1:]):
        line(d, a, b, BLUE, 7)
    a, b = pts[0], pts[-1]
    line(d, a, b, GREY, 3, 220)
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    c = pts[50]
    line(d, (m[0], oy), (m[0], c[1]), GREY, 2, 160)
    dot(d, m, 11, YELLOW)
    dot(d, c, 13, BLUE)
    dot(d, a, 11, PINK)
    dot(d, b, 11, GREEN)
    line(d, m, c, YELLOW, 6)


def tree(d):
    root = (CX - 215, CY)
    l1 = [(CX - 20, CY - 150), (CX - 20, CY + 150)]
    l2 = [[(CX + 190, CY - 215), (CX + 190, CY - 85)], [(CX + 190, CY + 85), (CX + 190, CY + 215)]]
    hot = {(0, 1)}
    for i, n1 in enumerate(l1):
        line(d, root, n1, GREEN if i == 0 else GREY, 6 if i == 0 else 3)
        for j, n2 in enumerate(l2[i]):
            on = (i, j) in hot
            line(d, n1, n2, GREEN if on else GREY, 6 if on else 3)
            dot(d, n2, 14, GREEN if on else GREY)
        dot(d, n1, 15, GREEN if i == 0 else BLUE)
    dot(d, root, 17, WHITE)
    ring(d, l1[1], 28, PINK, 3, 150)


def network(d):
    r = 190
    nodes = [(CX + r * math.cos(a), CY + r * math.sin(a)) for a in [math.radians(-90 + 60 * k) for k in range(6)]]
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (0, 3), (1, 4)]
    hot = {(0, 1), (1, 4), (0, 3)}
    for a, b in edges:
        line(d, nodes[a], nodes[b], YELLOW if (a, b) in hot else GREY, 6 if (a, b) in hot else 3)
    for k, n in enumerate(nodes):
        dot(d, n, 22, (BLUE, GREEN, PINK, YELLOW, BLUE, GREEN)[k])


def bipartite(d):
    L = [(CX - 150, CY - 195 + 130 * k) for k in range(4)]
    R = [(CX + 150, CY - 195 + 130 * k) for k in range(4)]
    allp = [(0, 1), (0, 0), (1, 0), (1, 2), (2, 2), (2, 1), (3, 3), (3, 2)]
    stable = {(0, 1), (1, 0), (2, 2), (3, 3)}
    for a, b in allp:
        if (a, b) not in stable:
            line(d, L[a], R[b], GREY, 2, 170)
    for a, b in stable:
        line(d, L[a], R[b], GREEN, 7)
    for p in L:
        dot(d, p, 22, BLUE)
    for p in R:
        dot(d, p, 22, YELLOW)


MOTIFS = {"simplex": simplex, "payoff": payoff, "curve": curve, "tree": tree, "network": network, "bipartite": bipartite}


# ----------------------------------------------------------------------------- layout
def parse_hook(s):
    """'BUT WHAT IS|*UTILITY*?' -> [[('BUT WHAT IS', False)], [('UTILITY', True), ('?', False)]]"""
    rows = []
    for ln in s.split("|"):
        parts = ln.split("*")
        rows.append([(p, i % 2 == 1) for i, p in enumerate(parts) if p])
    return rows


def render(hook, subtitle, motif, part=None, accent="yellow", series="", out="thumbnail.png"):
    acc = ACCENTS[accent]
    global CURRENT_ACCENT
    CURRENT_ACCENT = acc
    base = Image.new("RGBA", (W * S, H * S), BG + (255,))
    g = ImageDraw.Draw(base)
    for x in range(0, W, 40):                       # faint 3b1b-style grid
        g.line([P(x, 0), P(x, H)], fill=GRID + (255,), width=S)
    for y in range(0, H, 40):
        g.line([P(0, y), P(W, y)], fill=GRID + (255,), width=S)

    fx = Image.new("RGBA", base.size, (0, 0, 0, 0))   # motif layer, blurred copy underneath = glow
    MOTIFS[motif](ImageDraw.Draw(fx))
    glow = fx.filter(ImageFilter.GaussianBlur(14 * S))
    glow.putalpha(glow.getchannel("A").point(lambda v: min(255, int(v * 1.6))))
    base = Image.alpha_composite(base, glow)
    base = Image.alpha_composite(base, fx)
    d = ImageDraw.Draw(base)

    # badge: series name (or subject label) + part number pill, each only when given
    bf = bold(38)
    tw = 0
    if series:
        d.text(P(70, 70), series, font=bf, fill=GREY + (255,), anchor="lm")
        tw = d.textlength(series, font=bf) / S + 18
    if part:
        pw, ph = 92, 56
        px = 70 + tw
        d.rounded_rectangle([P(px, 70 - ph / 2), P(px + pw, 70 + ph / 2)], radius=12 * S, fill=acc + (255,))
        text_c(d, (px + pw / 2, 70), f"{int(part):02d}", bold(40), BG)

    # hook: largest size that fits 640 px wide and 3 lines
    rows = parse_hook(hook)
    size = 170
    while size > 40:
        f = bold(size)
        widest = max(sum(d.textlength(t, font=f) for t, _ in r) / S for r in rows)
        if widest <= 600 and size * 1.0 * len(rows) <= 400:
            break
        size -= 4
    lh = size * 1.0
    y = 360 - lh * len(rows) / 2 + lh / 2 - 10
    for r in rows:
        x = 70
        for t, hot in r:
            d.text(P(x, y), t, font=f, fill=(acc if hot else WHITE) + (255,), anchor="lm")
            x += d.textlength(t, font=f) / S
        y += lh
    if subtitle:
        d.text(P(70, 360 + lh * len(rows) / 2 + 62), subtitle, font=regular(50), fill=BLUE + (255,), anchor="lm")

    img = base.convert("RGB").resize((W, H), Image.LANCZOS)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    return out


def sheet(out):
    tiles = []
    demo = [("WHAT IS|*UTILITY?*", "von Neumann–Morgenstern", "simplex"), ("WHY SMART|PLAYERS *LOSE*", "Prisoner's dilemma", "payoff"),
            ("RISK IS|*CURVATURE*", "Expected utility", "curve"), ("THINKING|*BACKWARDS*", "Subgame perfect equilibrium", "tree"),
            ("100 PLAYERS,|*ONE TABLE?*", "Graphical games", "network"), ("DOCTORS &|*HOSPITALS*", "Gale–Shapley", "bipartite")]
    for k, (h, s, m) in enumerate(demo):
        render(h, s, m, k + 1, out="/tmp/_t.png")
        tiles.append(Image.open("/tmp/_t.png").resize((640, 360)))
    sh = Image.new("RGB", (1280, 1080))
    for k, t in enumerate(tiles):
        sh.paste(t, ((k % 2) * 640, (k // 2) * 360))
    sh.save(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--hook")
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--motif", default="simplex", choices=sorted(MOTIFS))
    ap.add_argument("--part", type=int, default=None)
    ap.add_argument("--accent", default="yellow", choices=sorted(ACCENTS))
    ap.add_argument("--series", default="")
    ap.add_argument("--out", default="build/out/youtube/thumbnail.png")
    ap.add_argument("--sheet", action="store_true")
    a = ap.parse_args()
    if a.sheet:
        sheet(a.out if a.out != "build/out/youtube/thumbnail.png" else "thumbnail_sheet.png")
        return
    if not a.hook:
        sys.exit("--hook is required")
    print(render(a.hook, a.subtitle, a.motif, a.part, a.accent, a.series, a.out))


if __name__ == "__main__":
    main()
