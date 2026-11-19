#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build/burn_subs.py — burn SRT captions into a band under the video, without libass/freetype.

    python build/burn_subs.py build/out/final.mp4 build/out/subtitles.srt build/out/final_youtube_subs.mp4

The picture is scaled to 92.6 % of the height and a charcoal band (#0e1117) is stacked below it;
captions are drawn into the band with Pillow, so they can never cover the animation. Works with any
ffmpeg build (only scale / fps / vstack are used). Needs: pip install pillow
"""
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = (14, 17, 23)          # #0e1117
FG = (243, 244, 246)       # #F3F4F6
FONTS = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
]


def sh(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout.strip()


def probe(path):
    w, h, r = sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                  "stream=width,height,r_frame_rate", "-of", "csv=p=0", path]).split(",")
    num, den = r.split("/")
    dur = float(sh(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))
    return int(w), int(h), float(num) / float(den), dur


def parse_srt(path):
    cues = []
    for block in re.split(r"\n\s*\n", Path(path).read_text(encoding="utf-8").strip()):
        lines = block.strip().splitlines()
        m = re.search(r"(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)", block)
        if not m:
            continue
        g = list(map(int, m.groups()))
        start = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
        end = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
        text = " ".join(l for l in lines if "-->" not in l and not l.strip().isdigit())
        cues.append((start, end, text.strip()))
    return cues


def load_font(size):
    for f in FONTS:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    sys.exit("no TrueType font found — add one to FONTS in build/burn_subs.py")


def caption_image(text, w, band, base_size):
    img = Image.new("RGB", (w, band), BG)
    if not text:
        return img
    size = base_size
    while True:
        font = load_font(size)
        d = ImageDraw.Draw(img)
        box = d.textbbox((0, 0), text, font=font)
        if box[2] - box[0] <= w * 0.94 or size <= 8:
            break
        size -= 2
    x = (w - (box[2] - box[0])) / 2 - box[0]
    y = (band - (box[3] - box[1])) / 2 - box[1]
    d.text((x, y), text, font=font, fill=FG)
    return img


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    src, srt, out = sys.argv[1:]
    W, H, fps, dur = probe(src)
    band = (H * 200 // 2160) // 2 * 2
    vh = H - band
    vh -= vh % 2
    band = H - vh
    base = max(int(H * 0.034), 12)

    cues = parse_srt(srt)
    tmp = Path(tempfile.mkdtemp(prefix="burnsubs_"))
    blank = tmp / "blank.png"
    caption_image("", W, band, base).save(blank)
    lines, t = [], 0.0

    def add(png, seconds):
        if seconds > 1e-3:
            lines.append(f"file '{png}'\nduration {seconds:.4f}\n")

    for i, (s, e, text) in enumerate(cues):
        s, e = max(s, t), min(e, dur)
        if e <= s:
            continue
        add(blank, s - t)
        p = tmp / f"c{i:04d}.png"
        caption_image(text, W, band, base).save(p)
        add(p, e - s)
        t = e
    add(blank, dur - t + 0.5)
    lines.append(f"file '{blank}'\n")          # concat demuxer ignores the last duration
    (tmp / "list.txt").write_text("".join(lines), encoding="utf-8")

    fc = (f"[0:v]scale={W}:{vh},setsar=1[v];"
          f"[1:v]fps={fps:.3f},scale={W}:{band},setsar=1,format=yuv420p[b];"
          f"[v][b]vstack=inputs=2:shortest=1[out]")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-stats", "-i", src,
           "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
           "-filter_complex", fc, "-map", "[out]", "-map", "0:a?",
           "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(f"{len(cues)} captions burned → {out}")


if __name__ == "__main__":
    main()
